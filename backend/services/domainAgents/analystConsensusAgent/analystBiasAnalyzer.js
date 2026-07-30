// Phase ANALYST-CONSENSUS-AGENT-001 — "Analyst Bias" (Bullish/Neutral/
// Bearish) from the real Consensus Score, disclosed threshold bands
// (the same ±15 neutral-band convention already used by this session's
// macroScoreAnalyzer.js).
const NEUTRAL_BAND = 15;

/**
 * @param {number|null} consensusScore - -100..100, or null if unavailable
 * @returns {"BULLISH"|"NEUTRAL"|"BEARISH"|"UNKNOWN"}
 */
function analyzeAnalystBias(consensusScore) {
  if (!Number.isFinite(consensusScore)) return "UNKNOWN";
  if (consensusScore > NEUTRAL_BAND) return "BULLISH";
  if (consensusScore < -NEUTRAL_BAND) return "BEARISH";
  return "NEUTRAL";
}

module.exports = { analyzeAnalystBias, NEUTRAL_BAND };
