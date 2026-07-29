// Phase TECHNICAL-AGENT-001 — maps the existing, already-real trend
// signal (technicalIntelligenceService's own UPTREND/DOWNTREND/MIXED/
// ABOVE_50D_AVERAGE/BELOW_50D_AVERAGE vocabulary) onto this mission's
// simpler 3-state BULLISH/NEUTRAL/BEARISH output, and computes a real
// Trend Strength (0-100) primarily from ADX — the standard, dedicated
// trend-strength indicator (distinct from trend DIRECTION) — with an
// honest, disclosed fallback to the existing service's own coarser
// strength field when ADX cannot be computed (too few bars).
const BULLISH_TREND_SIGNALS = new Set(["UPTREND", "ABOVE_50D_AVERAGE"]);
const BEARISH_TREND_SIGNALS = new Set(["DOWNTREND", "BELOW_50D_AVERAGE"]);

function mapTrendDirection(trendSignal) {
  if (!trendSignal || trendSignal.enoughDataStatus !== "SUFFICIENT") return "NEUTRAL";
  if (BULLISH_TREND_SIGNALS.has(trendSignal.signal)) return "BULLISH";
  if (BEARISH_TREND_SIGNALS.has(trendSignal.signal)) return "BEARISH";
  return "NEUTRAL"; // MIXED or any other real value — no real, undivided lean
}

/**
 * @param {object} signals - TechnicalMetrics.signals
 * @param {number|null} adx
 * @returns {{ trend: "BULLISH"|"NEUTRAL"|"BEARISH", trendStrength: number, trendStrengthSource: "ADX"|"SIGNAL_STRENGTH"|"UNAVAILABLE" }}
 */
function analyzeTrend(signals, adx) {
  const trend = mapTrendDirection(signals.trend);

  if (Number.isFinite(adx)) {
    return { trend, trendStrength: Math.round(Math.min(100, Math.max(0, adx))), trendStrengthSource: "ADX" };
  }
  if (signals.trend?.enoughDataStatus === "SUFFICIENT" && Number.isFinite(signals.trend.strength)) {
    return { trend, trendStrength: signals.trend.strength, trendStrengthSource: "SIGNAL_STRENGTH" };
  }
  return { trend, trendStrength: 0, trendStrengthSource: "UNAVAILABLE" };
}

module.exports = { analyzeTrend, mapTrendDirection };
