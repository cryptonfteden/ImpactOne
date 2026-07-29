// Phase TECHNICAL-AGENT-001 — "Breakout Probability" (0-100), a
// deterministic, disclosed estimate (not a fitted statistical model —
// no historical backtest data exists in this environment to calibrate
// one, the same disclosed limitation every scoring formula this session
// has built carries) from real, already-computed inputs: the existing
// breakout signal's own state, real proximity to the real prior
// range extremes, real volume trend, and real trend strength (ADX).
function analyzeBreakoutProbability(metrics, adx) {
  const breakout = metrics.signals.breakout;
  if (!breakout || breakout.enoughDataStatus !== "SUFFICIENT" || breakout.signal === "UNKNOWN") {
    return { probability: null, reason: "Insufficient data to assess breakout probability." };
  }

  if (breakout.signal.includes("CONFIRMED") && !breakout.signal.includes("UNCONFIRMED")) {
    return { probability: 85, reason: "A volume-confirmed breakout has already occurred." };
  }
  if (breakout.signal.includes("UNCONFIRMED")) {
    return { probability: 55, reason: "A breakout occurred but was not confirmed by above-average volume." };
  }
  if (breakout.signal === "FAILED_BREAKOUT") {
    return { probability: 20, reason: "A recent breakout attempt has already failed and closed back inside its prior range." };
  }

  // NO_BREAKOUT: estimate from real proximity to the real prior range extremes.
  const { priorHigh, priorLow, lastClose } = breakout.calculationInputs;
  const range = priorHigh - priorLow;
  if (!Number.isFinite(range) || range <= 0 || !Number.isFinite(lastClose)) {
    return { probability: null, reason: "Insufficient real range data to assess breakout probability." };
  }

  const distanceToHigh = Math.abs(priorHigh - lastClose);
  const distanceToLow = Math.abs(lastClose - priorLow);
  const nearestDistance = Math.min(distanceToHigh, distanceToLow);
  const proximityScore = Math.max(0, 1 - nearestDistance / (range / 2)); // 1 = right at an extreme, 0 = dead center of the range

  let probability = 20 + proximityScore * 40; // real proximity contributes a 20-60 base range

  const volumePercentChange = metrics.volumeTrend?.percentChange;
  if (Number.isFinite(volumePercentChange) && volumePercentChange > 20) probability += 10;
  if (Number.isFinite(adx) && adx > 25) probability += 10;

  probability = Math.round(Math.max(0, Math.min(100, probability)));
  const nearestLevel = distanceToHigh < distanceToLow ? "resistance" : "support";
  return { probability, reason: `Estimated from real proximity to the nearest ${nearestLevel} level, real volume trend, and real trend strength (ADX).` };
}

module.exports = { analyzeBreakoutProbability };
