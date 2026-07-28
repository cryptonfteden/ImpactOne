// Phase OPTIONS-AGENT-001 — the provider abstraction the mission
// requires ("Create provider abstraction so data providers can be
// swapped later"). Anything downstream (marketBiasAnalyzer,
// signalsAnalyzer, riskSummary, aiSummary, the agent itself) depends
// only on the shape documented below, never on where the numbers came
// from — so a future paid vendor (real IV/Greeks/gamma-exposure feed)
// can be wired in as a second implementation of this exact interface
// without touching a single line of analysis code.
//
// ## The interface
// A conforming provider is any object exposing:
//   async getSymbolMetrics(symbol) -> OptionsMetrics
//
// `OptionsMetrics` shape (every field always present; a field this
// provider cannot really compute is `null`/empty, NEVER fabricated):
//   symbol            string
//   asOf              ISO string
//   dataAvailable     boolean — false when the options-flow provider
//                     itself isn't configured; every other field is then
//                     honestly empty/null, matching this project's
//                     existing optionsAgentService "unavailable" pattern.
//   optionVolume      { call, put, total } (contract count, real trade prints)
//   openInterest      { call, put, total } (null components if no OI
//                     snapshot exists yet for this symbol/window)
//   putCallRatio      number|null (put volume / call volume)
//   volumeOiRatio     number|null (total volume / total OI)
//   largeBlockTrades  Array<{ expiry, strike, optionType, size, notionalValue, aggressorSide, tradeTimestamp }>
//   unusualContracts  Array<OptionsSignal> (already-detected anomalies from
//                     the existing detection pipeline — see
//                     optionsAgentService.ingestAndDetect)
//   skew              { direction, putCallSkewZScore }|null (from the
//                     existing CALL_PUT_SKEW detector, when present)
//   greeks            { iv, ivRank, ivPercentile, delta, gammaExposure } —
//                     every field null today: no data source for these
//                     exists in this environment (no paid Greeks/IV
//                     vendor is connected — see optionsFlowProvider.js's
//                     own disclosure of the same gap). A future provider
//                     implementing this same interface can populate them
//                     for real without any analyzer code changing.
const optionsFlowProvider = require("../../providers/definitions/optionsFlowProvider");
const repository = require("../../optionsAgent/optionsFlowRepository");
const aggregator = require("../../optionsAgent/optionsFlowAggregator");

const DEFAULT_LOOKBACK_MS = 24 * 60 * 60 * 1000; // one trading-day window, matching optionsAgentService's own recency conventions
const DEFAULT_UNUSUAL_CONTRACT_LIMIT = 50;

function emptyMetrics(symbol, reason) {
  return {
    symbol,
    asOf: new Date().toISOString(),
    dataAvailable: false,
    unavailableReason: reason,
    optionVolume: { call: 0, put: 0, total: 0 },
    openInterest: { call: null, put: null, total: null },
    putCallRatio: null,
    volumeOiRatio: null,
    largeBlockTrades: [],
    unusualContracts: [],
    skew: null,
    greeks: { iv: null, ivRank: null, ivPercentile: null, delta: null, gammaExposure: null },
  };
}

/**
 * The default, internal implementation: real data, drawn entirely from
 * this platform's own already-ingested OptionsFlowPrint/
 * OptionsOpenInterestSnapshot/OptionsSignal tables — no external paid
 * API call of any kind. Honestly reports `dataAvailable: false` (and an
 * all-empty/null metrics object) when the underlying options-flow
 * provider itself isn't configured, exactly mirroring
 * optionsAgentService.getSymbolView's existing, already-tested honesty
 * discipline.
 */
function createInternalOptionsDataProvider({ now = () => new Date(), lookbackMs = DEFAULT_LOOKBACK_MS } = {}) {
  async function getSymbolMetrics(symbol) {
    if (!optionsFlowProvider.isConfigured()) {
      return emptyMetrics(symbol, optionsFlowProvider.configurationRequirement || "Options flow provider is not connected yet.");
    }

    const sinceDate = new Date(now().getTime() - lookbackMs);
    const [prints, oiSnapshots, unusualContracts] = await Promise.all([
      repository.findRecentPrints(symbol, sinceDate),
      repository.findRecentOpenInterestSnapshots(symbol, sinceDate),
      repository.listSignals({ symbol, since: sinceDate, limit: DEFAULT_UNUSUAL_CONTRACT_LIMIT }),
    ]);

    const [callPutVolume] = aggregator.aggregateSymbolCallPutVolume(prints);
    const callVolume = callPutVolume?.callVolume ?? 0;
    const putVolume = callPutVolume?.putVolume ?? 0;
    const totalVolume = callVolume + putVolume;

    // Most recent snapshot per contract, then summed by right — an OI
    // snapshot is end-of-day, so "most recent within the window" is the
    // real, current figure, never an average across the window.
    const latestOiByContract = new Map();
    for (const snap of oiSnapshots) {
      const key = `${snap.expiry.toISOString()}|${snap.strike.toString()}|${snap.optionType}`;
      const existing = latestOiByContract.get(key);
      if (!existing || snap.snapshotDate > existing.snapshotDate) latestOiByContract.set(key, snap);
    }
    let callOi = 0;
    let putOi = 0;
    let haveAnyOi = false;
    for (const snap of latestOiByContract.values()) {
      haveAnyOi = true;
      if (snap.optionType === "CALL") callOi += snap.openInterest;
      else putOi += snap.openInterest;
    }
    const totalOi = haveAnyOi ? callOi + putOi : null;

    const largeBlockTrades = unusualContracts
      .filter((signal) => signal.signalType === "BLOCK_TRADE")
      .map((signal) => ({
        expiry: signal.expiry,
        strike: signal.strike,
        optionType: signal.optionType,
        size: signal.largestSinglePrintSize ?? signal.totalVolume,
        notionalValue: signal.notionalValue,
        aggressorSide: signal.aggressorSide,
        tradeTimestamp: signal.detectedAt,
      }));

    const skewSignal = unusualContracts.find((signal) => signal.signalType === "CALL_PUT_SKEW") || null;

    return {
      symbol,
      asOf: now().toISOString(),
      dataAvailable: true,
      unavailableReason: null,
      optionVolume: { call: callVolume, put: putVolume, total: totalVolume },
      openInterest: { call: haveAnyOi ? callOi : null, put: haveAnyOi ? putOi : null, total: totalOi },
      putCallRatio: callVolume > 0 ? putVolume / callVolume : null,
      volumeOiRatio: totalOi ? totalVolume / totalOi : null,
      largeBlockTrades,
      unusualContracts,
      // Same sign convention as optionsSignalDetectors.detectCallPutSkew:
      // a positive Z-score means today's call/put volume ratio sits
      // above its historical baseline (relatively more call activity) —
      // "BULLISH_LEANING"; negative means relatively more put activity —
      // "BEARISH_LEANING". Recomputed here from the persisted Z-score
      // rather than re-reading the original detector's own `direction`
      // field, which is not a column on the OptionsSignal model.
      skew: skewSignal ? { direction: skewSignal.putCallSkewZScore >= 0 ? "BULLISH_LEANING" : "BEARISH_LEANING", putCallSkewZScore: skewSignal.putCallSkewZScore } : null,
      greeks: { iv: null, ivRank: null, ivPercentile: null, delta: null, gammaExposure: null },
    };
  }

  return { getSymbolMetrics };
}

module.exports = { createInternalOptionsDataProvider, emptyMetrics, DEFAULT_LOOKBACK_MS };
