// Phase FIBONACCI-AGENT-001 — "Multiple timeframe agreement": compares
// the real daily-timeframe primary swing/trend against the real
// weekly-timeframe one. Agreement is real and structural (same swing
// direction, same trend direction) — never inferred from a single
// timeframe alone, and honestly reports when the weekly timeframe
// couldn't be computed (too few real weekly bars) rather than
// fabricating a second opinion.
function directionOf(trendSignal) {
  if (!trendSignal || trendSignal.enoughDataStatus !== "SUFFICIENT") return null;
  if (trendSignal.signal === "UPTREND" || trendSignal.signal === "ABOVE_50D_AVERAGE") return "UP";
  if (trendSignal.signal === "DOWNTREND" || trendSignal.signal === "BELOW_50D_AVERAGE") return "DOWN";
  return null; // MIXED or any other real value — no real, undivided lean
}

/**
 * @param {object|null} dailySwing - from swingDetector.detectPrimarySwing(dailyBars)
 * @param {object|null} weeklySwing - from swingDetector.detectPrimarySwing(weeklyBars)
 * @param {object|null} dailyTrendSignal
 * @param {object|null} weeklyTrendSignal
 * @returns {{ agreement: "AGREE"|"CONFLICT"|"SINGLE_TIMEFRAME_ONLY"|"UNKNOWN", dailyDirection: string|null, weeklyDirection: string|null }}
 */
function analyzeTimeframeAgreement(dailySwing, weeklySwing, dailyTrendSignal, weeklyTrendSignal) {
  const dailyDirection = dailySwing?.direction || directionOf(dailyTrendSignal);
  const weeklyDirection = weeklySwing?.direction || directionOf(weeklyTrendSignal);

  if (!dailyDirection && !weeklyDirection) return { agreement: "UNKNOWN", dailyDirection: null, weeklyDirection: null };
  if (dailyDirection && !weeklyDirection) return { agreement: "SINGLE_TIMEFRAME_ONLY", dailyDirection, weeklyDirection: null };
  if (!dailyDirection && weeklyDirection) return { agreement: "SINGLE_TIMEFRAME_ONLY", dailyDirection: null, weeklyDirection };

  return {
    agreement: dailyDirection === weeklyDirection ? "AGREE" : "CONFLICT",
    dailyDirection,
    weeklyDirection,
  };
}

module.exports = { analyzeTimeframeAgreement, directionOf };
