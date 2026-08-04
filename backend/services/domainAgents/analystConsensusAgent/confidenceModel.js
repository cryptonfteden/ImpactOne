// Phase ANALYST-CONSENSUS-AGENT-001 — "Confidence (0-100)". A
// disclosed, weighted blend of real data availability and quality —
// never a naive average. Base confidence requires the real rating-
// trend series; bonuses for real multi-period history (enables a real
// trend/revision read) and real analyst coverage depth; a disclosed,
// fixed penalty for this agent's permanent price-target scope
// limitation (Finnhub's free tier 403s on that endpoint), mirroring
// the short-interest agent's own borrow-stress confidence penalty.
const BASE = 30;
const MULTI_PERIOD_BONUS = 25;
const COVERAGE_BONUS_HIGH = 25;
const COVERAGE_BONUS_MODERATE = 15;
const COVERAGE_BONUS_LOW = 5;
const PRICE_TARGET_PENALTY = 20;

/**
 * @param {{ dataAvailable: boolean, periodCount: number, coverageQuality: string, priceTargetsAvailable: boolean }} inputs
 * @returns {{ confidence: number, components: object }}
 */
function computeConfidence({ dataAvailable, periodCount, coverageQuality, priceTargetsAvailable }) {
  if (!dataAvailable) {
    return { confidence: 0, components: { base: 0, multiPeriodBonus: 0, coverageBonus: 0, priceTargetPenalty: 0 } };
  }

  const base = BASE;
  const multiPeriodBonus = periodCount >= 2 ? MULTI_PERIOD_BONUS : 0;

  let coverageBonus = 0;
  if (coverageQuality === "HIGH") coverageBonus = COVERAGE_BONUS_HIGH;
  else if (coverageQuality === "MODERATE") coverageBonus = COVERAGE_BONUS_MODERATE;
  else if (coverageQuality === "LOW") coverageBonus = COVERAGE_BONUS_LOW;

  const priceTargetPenalty = priceTargetsAvailable ? 0 : PRICE_TARGET_PENALTY;

  const confidence = Math.max(0, Math.min(100, base + multiPeriodBonus + coverageBonus - priceTargetPenalty));

  return { confidence, components: { base, multiPeriodBonus, coverageBonus, priceTargetPenalty } };
}

module.exports = { computeConfidence, BASE, MULTI_PERIOD_BONUS, COVERAGE_BONUS_HIGH, COVERAGE_BONUS_MODERATE, COVERAGE_BONUS_LOW, PRICE_TARGET_PENALTY };
