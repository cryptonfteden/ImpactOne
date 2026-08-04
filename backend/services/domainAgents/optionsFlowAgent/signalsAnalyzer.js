// Phase OPTIONS-AGENT-001 — pure presentation/ranking over already-real
// OptionsMetrics. No new detection logic is invented here — every
// signal below is either a direct read of the provider's own fields, or
// a simple, documented derivation (a top-N sort, a sum, a ratio). The
// actual anomaly detection (what counts as a volume spike/sweep/block/
// skew) remains exactly optionsSignalDetectors.js's job, unchanged.

const DEFAULT_TOP_N = 5;

function toPlainContract(signal) {
  return {
    symbol: signal.symbol,
    expiry: signal.expiry,
    strike: Number(signal.strike),
    optionType: signal.optionType,
    signalType: signal.signalType,
    anomalyScore: Number(signal.anomalyScore),
    volumeMultiple: signal.volumeMultiple === null || signal.volumeMultiple === undefined ? null : Number(signal.volumeMultiple),
    explanation: signal.explanation,
  };
}

/** The N highest-anomaly-score contracts this window, most unusual first. */
function mostUnusualContracts(metrics, { topN = DEFAULT_TOP_N } = {}) {
  return [...metrics.unusualContracts]
    .sort((a, b) => Number(b.anomalyScore) - Number(a.anomalyScore))
    .slice(0, topN)
    .map(toPlainContract);
}

/**
 * "Institutional activity" here means real block trades and sweeps —
 * the two signal types this platform's own detectors already reserve
 * for size/venue patterns retail order flow essentially never produces
 * (a genuine multi-exchange sweep, or a single print clearing the block
 * threshold) — never a fabricated "smart money" inference beyond that.
 */
function institutionalActivity(metrics) {
  const blockAndSweep = metrics.unusualContracts.filter((signal) => signal.signalType === "BLOCK_TRADE" || signal.signalType === "SWEEP");
  const totalNotional = blockAndSweep.reduce((sum, signal) => sum + Number(signal.notionalValue || 0), 0);
  return {
    detected: blockAndSweep.length > 0,
    contractCount: blockAndSweep.length,
    totalNotionalValue: totalNotional,
    largestSingleTrade: metrics.largeBlockTrades.length
      ? metrics.largeBlockTrades.reduce((largest, trade) => (Number(trade.notionalValue) > Number(largest.notionalValue || 0) ? trade : largest), metrics.largeBlockTrades[0])
      : null,
  };
}

/** Real net call/put volume this window — a straightforward read, not a trend model (no historical series is available to fit one honestly). */
function accumulation(metrics) {
  const { call, put } = metrics.optionVolume;
  return {
    callAccumulation: { volume: call, share: metrics.optionVolume.total > 0 ? call / metrics.optionVolume.total : null },
    putAccumulation: { volume: put, share: metrics.optionVolume.total > 0 ? put / metrics.optionVolume.total : null },
  };
}

/**
 * Volatility regime: this platform has no IV/IV-Rank/IV-Percentile data
 * source (no paid Greeks vendor is connected — see
 * optionsDataProvider.js's own disclosure). Rather than fabricate a
 * regime label from an unrelated proxy, this honestly reports UNKNOWN
 * with the real reason — the same "insufficient/unavailable, not
 * guessed" discipline this whole platform's options-flow detectors
 * already follow for baseline history.
 */
function volatilityRegime(metrics) {
  if (metrics.greeks.ivRank === null && metrics.greeks.iv === null) {
    return { regime: "UNKNOWN", reason: "No implied-volatility data source is connected yet (see greeks fields on OptionsMetrics)." };
  }
  // Reachable once a real IV provider is wired in behind the same
  // OptionsDataProvider interface — deliberately conservative bands.
  if (metrics.greeks.ivRank >= 70) return { regime: "ELEVATED", reason: `IV Rank ${metrics.greeks.ivRank} is in the top band for this symbol's own history.` };
  if (metrics.greeks.ivRank <= 30) return { regime: "SUPPRESSED", reason: `IV Rank ${metrics.greeks.ivRank} is in the bottom band for this symbol's own history.` };
  return { regime: "NORMAL", reason: `IV Rank ${metrics.greeks.ivRank} sits within its typical middle range.` };
}

function buildSignals(metrics, options = {}) {
  const { callAccumulation, putAccumulation } = accumulation(metrics);
  return {
    mostUnusualContracts: mostUnusualContracts(metrics, options),
    institutionalActivity: institutionalActivity(metrics),
    callAccumulation,
    putAccumulation,
    volatilityRegime: volatilityRegime(metrics),
  };
}

module.exports = { buildSignals, mostUnusualContracts, institutionalActivity, accumulation, volatilityRegime, DEFAULT_TOP_N };
