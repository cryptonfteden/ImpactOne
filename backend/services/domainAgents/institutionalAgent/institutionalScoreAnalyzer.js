// Phase INSTITUTIONAL-AGENT-001 — "Institutional Bias" (Bullish/
// Neutral/Bearish) and "Institutional Score" (-100..100). A disclosed,
// hand-set weighted formula (never a naive average): the real net
// reported-share direction (accumulation vs. distribution, weighted
// 60%) combined with the real net count of new vs. closed positions
// (weighted 40%, each real event worth a disclosed 20 points, capped
// at ±100 before weighting) — two genuinely different real signals
// (magnitude of repositioning vs. count of fresh conviction changes)
// blended with disclosed weights, not summed naively.
const NET_VALUE_WEIGHT = 0.6;
const NET_POSITION_COUNT_WEIGHT = 0.4;
const POINTS_PER_NET_POSITION = 20;

const BULLISH_THRESHOLD = 20;
const BEARISH_THRESHOLD = -20;

/**
 * @param {{ totalIncreaseShares: number, totalDecreaseShares: number }} accumulationDistribution
 * @param {{ newPositions: Array, closedPositions: Array }} newClosedPositions
 * @returns {{ institutionalBias: "BULLISH"|"NEUTRAL"|"BEARISH", institutionalScore: number }}
 */
function analyzeInstitutionalScore(accumulationDistribution, newClosedPositions) {
  const { totalIncreaseShares = 0, totalDecreaseShares = 0 } = accumulationDistribution;
  const totalActivity = totalIncreaseShares + totalDecreaseShares;
  const netValueScore = totalActivity > 0 ? ((totalIncreaseShares - totalDecreaseShares) / totalActivity) * 100 : 0;

  const netPositionCount = newClosedPositions.newPositions.length - newClosedPositions.closedPositions.length;
  const netPositionScore = Math.max(-100, Math.min(100, netPositionCount * POINTS_PER_NET_POSITION));

  const institutionalScore = Math.round(Math.max(-100, Math.min(100, netValueScore * NET_VALUE_WEIGHT + netPositionScore * NET_POSITION_COUNT_WEIGHT)));

  let institutionalBias = "NEUTRAL";
  if (institutionalScore >= BULLISH_THRESHOLD) institutionalBias = "BULLISH";
  else if (institutionalScore <= BEARISH_THRESHOLD) institutionalBias = "BEARISH";

  return { institutionalBias, institutionalScore };
}

module.exports = { analyzeInstitutionalScore, NET_VALUE_WEIGHT, NET_POSITION_COUNT_WEIGHT, POINTS_PER_NET_POSITION, BULLISH_THRESHOLD, BEARISH_THRESHOLD };
