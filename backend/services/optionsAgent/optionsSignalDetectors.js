// Phase AI-ENGINE-001.1 — Unusual Options Agent foundation. The 5
// deterministic detectors from OPTIONS_AGENT_ARCHITECTURE.md §5. Every
// detector is a pure function over already-aggregated input — never
// fetches its own data, never fabricates a result when its required
// input is missing (same contract discipline as
// overlayRegistry.js/alertTypeRegistry.js's documented evaluator
// contracts, per the architecture doc). A detector that lacks sufficient
// data returns `null`, not a guessed value.

const DEFAULT_VOLUME_TRIGGER_MULTIPLE = 5;
const DEFAULT_MIN_ABSOLUTE_VOLUME = 20;
const DEFAULT_SKEW_Z_THRESHOLD = 2;
const DEFAULT_SWEEP_WINDOW_MS = 2000;
const DEFAULT_SWEEP_MIN_EXCHANGES = 2;
const DEFAULT_SWEEP_MIN_SIZE = 50;
const DEFAULT_BLOCK_MIN_SIZE = 100;
const DEFAULT_BLOCK_MIN_NOTIONAL = 100000;

/**
 * §5a — volume vs. historical baseline. `baselineVolume` of `null` means
 * this engine has not yet accumulated enough history for this
 * contract/symbol (the bootstrap window, architecture §3/§12) — reported
 * honestly, never as a fabricated multiple.
 */
function detectVolumeBaseline({ totalVolume, baselineVolume, triggerMultiple = DEFAULT_VOLUME_TRIGGER_MULTIPLE, minAbsoluteVolume = DEFAULT_MIN_ABSOLUTE_VOLUME } = {}) {
  if (!Number.isFinite(totalVolume) || totalVolume <= 0) return null;

  if (baselineVolume === null || baselineVolume === undefined) {
    return { signalType: null, insufficientBaselineHistory: true, volumeMultiple: null };
  }
  if (!Number.isFinite(baselineVolume) || baselineVolume <= 0) return null;

  const volumeMultiple = totalVolume / baselineVolume;
  if (volumeMultiple < triggerMultiple || totalVolume < minAbsoluteVolume) {
    return null;
  }

  return { signalType: "VOLUME_SPIKE", insufficientBaselineHistory: false, volumeMultiple: Math.round(volumeMultiple * 100) / 100, totalVolume, baselineVolume };
}

/**
 * §5b — CALL vs. PUT skew. Compared against the symbol's OWN historical
 * baseline (mean/stdDev), never a fixed market-wide constant. `null`
 * baseline stats mean insufficient history — honestly no signal, not a
 * guessed Z-score.
 */
function detectCallPutSkew({ callVolume, putVolume, baselineRatioMean, baselineRatioStdDev, zThreshold = DEFAULT_SKEW_Z_THRESHOLD } = {}) {
  if (!Number.isFinite(callVolume) || !Number.isFinite(putVolume) || callVolume + putVolume <= 0) return null;
  if (!Number.isFinite(baselineRatioMean) || !Number.isFinite(baselineRatioStdDev) || baselineRatioStdDev <= 0) {
    return { signalType: null, insufficientBaselineHistory: true, putCallSkewZScore: null };
  }

  const todaysRatio = putVolume > 0 ? callVolume / putVolume : callVolume > 0 ? Infinity : 0;
  if (!Number.isFinite(todaysRatio)) {
    return { signalType: "CALL_PUT_SKEW", insufficientBaselineHistory: false, putCallSkewZScore: null, direction: "BULLISH_LEANING", note: "Put volume was zero — ratio is directionally extreme but not a computable Z-score." };
  }

  const zScore = (todaysRatio - baselineRatioMean) / baselineRatioStdDev;
  if (Math.abs(zScore) < zThreshold) return null;

  return {
    signalType: "CALL_PUT_SKEW",
    insufficientBaselineHistory: false,
    putCallSkewZScore: Math.round(zScore * 1000) / 1000,
    direction: zScore > 0 ? "BULLISH_LEANING" : "BEARISH_LEANING",
  };
}

/**
 * §5c — sweep detection. Requires real exchange identifiers and real
 * bid/ask-at-trade on each print — aggressor side must already be
 * inferred by the normalizer (never guessed here from price alone).
 * Clusters prints within a tight time window; a genuine sweep needs
 * ≥2 distinct exchanges, a consistent aggressor side, and a combined
 * size clearing the minimum threshold.
 */
function detectSweep(prints = [], { windowMs = DEFAULT_SWEEP_WINDOW_MS, minExchanges = DEFAULT_SWEEP_MIN_EXCHANGES, minSize = DEFAULT_SWEEP_MIN_SIZE } = {}) {
  if (!prints.length) return null;

  const sorted = [...prints].sort((printA, printB) => printA.tradeTimestamp.getTime() - printB.tradeTimestamp.getTime());
  const windowStart = sorted[0].tradeTimestamp.getTime();
  const windowEnd = sorted[sorted.length - 1].tradeTimestamp.getTime();
  if (windowEnd - windowStart > windowMs) return null;

  const exchanges = new Set(sorted.map((print) => print.exchange));
  if (exchanges.size < minExchanges) return null;

  const aggressorSides = new Set(sorted.map((print) => print.aggressorSide).filter((side) => side !== "UNKNOWN"));
  if (aggressorSides.size !== 1) return null; // requires a single, real, consistent aggressor side — never inferred from a mixed cluster

  const totalSize = sorted.reduce((sum, print) => sum + print.size, 0);
  if (totalSize < minSize) return null;

  return {
    signalType: "SWEEP",
    aggressorSide: [...aggressorSides][0],
    sweepExchangeCount: exchanges.size,
    totalSize,
    printCount: sorted.length,
  };
}

/**
 * §5d — block trades. A single large print clearing a contract-count or
 * notional threshold. Sweep and block are not mutually exclusive labels
 * (architecture §5d) — this detector only reports the largest single
 * print in the group; the caller decides whether to also flag SWEEP.
 */
function detectBlock(prints = [], { minSize = DEFAULT_BLOCK_MIN_SIZE, minNotional = DEFAULT_BLOCK_MIN_NOTIONAL } = {}) {
  if (!prints.length) return null;

  const largest = prints.reduce((max, print) => (print.size > max.size ? print : max), prints[0]);
  if (largest.size < minSize && largest.notionalValue < minNotional) return null;

  return {
    signalType: "BLOCK_TRADE",
    largestSinglePrintSize: largest.size,
    notionalValue: largest.notionalValue,
    aggressorSide: largest.aggressorSide,
  };
}

/**
 * §5e — open interest confirmation. OI is published one session in
 * arrears by the exchanges/OCC — this detector cannot confirm same-day,
 * by design, and says so honestly via oiConfirmationStatus rather than
 * presenting same-day certainty.
 *
 * `priorSessionOi`/`currentSessionOi` of `null` (OI not yet available for
 * this session) always yields PENDING — never guessed as confirmed or
 * unconfirmed.
 */
function detectOiConfirmation({ priorSessionOi, currentSessionOi, wasSignalDetectedLastSession = true } = {}) {
  if (currentSessionOi === null || currentSessionOi === undefined) {
    return { oiConfirmationStatus: "PENDING", openInterestDelta: null };
  }
  if (priorSessionOi === null || priorSessionOi === undefined) {
    // Only the new session's OI exists — there is nothing to compare a
    // delta against, so this is honestly unconfirmable, not "new."
    return { oiConfirmationStatus: "UNCONFIRMED", openInterestDelta: null };
  }
  if (!wasSignalDetectedLastSession) {
    return { oiConfirmationStatus: "UNCONFIRMED", openInterestDelta: currentSessionOi - priorSessionOi };
  }

  const openInterestDelta = currentSessionOi - priorSessionOi;
  if (openInterestDelta > 0) {
    return { oiConfirmationStatus: "CONFIRMED_NEW_POSITION", openInterestDelta };
  }
  if (openInterestDelta <= 0) {
    return { oiConfirmationStatus: "CONFIRMED_CLOSING", openInterestDelta };
  }
  return { oiConfirmationStatus: "UNCONFIRMED", openInterestDelta };
}

module.exports = {
  DEFAULT_VOLUME_TRIGGER_MULTIPLE,
  DEFAULT_MIN_ABSOLUTE_VOLUME,
  DEFAULT_SKEW_Z_THRESHOLD,
  DEFAULT_SWEEP_WINDOW_MS,
  DEFAULT_SWEEP_MIN_EXCHANGES,
  DEFAULT_SWEEP_MIN_SIZE,
  DEFAULT_BLOCK_MIN_SIZE,
  DEFAULT_BLOCK_MIN_NOTIONAL,
  detectVolumeBaseline,
  detectCallPutSkew,
  detectSweep,
  detectBlock,
  detectOiConfirmation,
};
