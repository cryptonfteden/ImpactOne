// Phase FIBONACCI-AGENT-001 — "Trend Context": maps the existing,
// already-real daily trend signal (technicalIntelligenceService's own
// UPTREND/DOWNTREND/MIXED/ABOVE_50D_AVERAGE/BELOW_50D_AVERAGE
// vocabulary — the same real signal TECHNICAL-AGENT-001's own
// trendAnalyzer.js already maps) onto this mission's BULLISH/NEUTRAL/
// BEARISH context, which every retracement/extension/zone read below is
// interpreted against (a retracement level only means "potential
// support" if the surrounding trend context is genuinely bullish).
const BULLISH_TREND_SIGNALS = new Set(["UPTREND", "ABOVE_50D_AVERAGE"]);
const BEARISH_TREND_SIGNALS = new Set(["DOWNTREND", "BELOW_50D_AVERAGE"]);

/**
 * @param {object|null} trendSignal
 * @returns {"BULLISH"|"NEUTRAL"|"BEARISH"}
 */
function analyzeTrendContext(trendSignal) {
  if (!trendSignal || trendSignal.enoughDataStatus !== "SUFFICIENT") return "NEUTRAL";
  if (BULLISH_TREND_SIGNALS.has(trendSignal.signal)) return "BULLISH";
  if (BEARISH_TREND_SIGNALS.has(trendSignal.signal)) return "BEARISH";
  return "NEUTRAL";
}

module.exports = { analyzeTrendContext };
