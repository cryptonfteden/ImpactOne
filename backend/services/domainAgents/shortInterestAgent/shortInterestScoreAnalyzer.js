// Phase SHORT-INTEREST-AGENT-001 — "Short Interest Bias" (Bullish/
// Neutral/Bearish) and "Short Interest Score" (-100..100). A disclosed
// interpretation choice, documented here rather than left implicit:
// real INCREASING short-selling volume (more real bearish positioning
// building) maps to a BEARISH score; real DECREASING short-selling
// volume (real covering/reduced bearish positioning) maps to BULLISH —
// the conventional, direct reading, not a contrarian one. A disclosed
// scale converts the real average short-volume-ratio delta
// (shortInterestTrendAnalyzer.js) into a -100..100 score.
const SCORE_SCALE_DELTA = 0.1; // a real 10-percentage-point average swing maps to the full ±100

const BULLISH_THRESHOLD = 20;
const BEARISH_THRESHOLD = -20;

/**
 * @param {{ delta: number|null }} trendAnalysis - from shortInterestTrendAnalyzer
 * @returns {{ shortInterestBias: "BULLISH"|"NEUTRAL"|"BEARISH", shortInterestScore: number }}
 */
function analyzeShortInterestScore({ delta }) {
  if (!Number.isFinite(delta)) {
    return { shortInterestBias: "NEUTRAL", shortInterestScore: 0 };
  }

  const shortInterestScore = Math.round(Math.max(-100, Math.min(100, (-delta / SCORE_SCALE_DELTA) * 100)));

  let shortInterestBias = "NEUTRAL";
  if (shortInterestScore >= BULLISH_THRESHOLD) shortInterestBias = "BULLISH";
  else if (shortInterestScore <= BEARISH_THRESHOLD) shortInterestBias = "BEARISH";

  return { shortInterestBias, shortInterestScore };
}

module.exports = { analyzeShortInterestScore, SCORE_SCALE_DELTA, BULLISH_THRESHOLD, BEARISH_THRESHOLD };
