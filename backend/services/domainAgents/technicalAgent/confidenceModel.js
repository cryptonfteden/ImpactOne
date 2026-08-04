// Phase TECHNICAL-AGENT-001 — overall "Confidence" (0-100), a disclosed,
// hand-set weighted formula (never a naive average) blending three real
// factors: data completeness (enough bars for the underlying signals),
// directional agreement between trend and momentum (corroboration bonus
// when they align, a penalty when they conflict), and data freshness
// (a penalty when the last real bar is stale).
const BASE_COMPLETE = 55;
const BASE_INCOMPLETE = 20;
const AGREEMENT_BONUS = 20;
const CONFLICT_PENALTY = 15;
const STALE_PENALTY = 15;
const STALE_AGE_DAYS = 5;

const BULLISH_MOMENTUM = new Set(["STRONG_BULLISH", "BULLISH", "OVERSOLD_OPPORTUNITY"]);
const BEARISH_MOMENTUM = new Set(["STRONG_BEARISH", "BEARISH", "OVERBOUGHT_CAUTION"]);

function directionalAgreement(trend, momentumState) {
  if (trend === "NEUTRAL" || momentumState === "NEUTRAL") return "NONE";
  const momentumIsBullish = BULLISH_MOMENTUM.has(momentumState);
  const momentumIsBearish = BEARISH_MOMENTUM.has(momentumState);
  if (trend === "BULLISH" && momentumIsBullish) return "AGREE";
  if (trend === "BEARISH" && momentumIsBearish) return "AGREE";
  if ((trend === "BULLISH" && momentumIsBearish) || (trend === "BEARISH" && momentumIsBullish)) return "CONFLICT";
  return "NONE";
}

/**
 * @param {object} metrics - TechnicalMetrics
 * @param {string} trend - from trendAnalyzer
 * @param {string} momentumState - from momentumAnalyzer
 * @returns {{ confidence: number, dataCompleteness: string, agreement: string, freshnessPenaltyApplied: boolean }}
 */
function computeConfidence(metrics, trend, momentumState) {
  if (!metrics.dataAvailable) {
    return { confidence: 0, dataCompleteness: "UNAVAILABLE", agreement: "NONE", freshnessPenaltyApplied: false };
  }

  const complete = metrics.enoughDataStatus === "SUFFICIENT";
  let confidence = complete ? BASE_COMPLETE : BASE_INCOMPLETE;

  const agreement = directionalAgreement(trend, momentumState);
  if (agreement === "AGREE") confidence += AGREEMENT_BONUS;
  else if (agreement === "CONFLICT") confidence -= CONFLICT_PENALTY;

  const ageDays = metrics.freshness?.ageDays;
  const freshnessPenaltyApplied = Number.isFinite(ageDays) && ageDays > STALE_AGE_DAYS;
  if (freshnessPenaltyApplied) confidence -= STALE_PENALTY;

  confidence = Math.round(Math.max(0, Math.min(100, confidence)));

  return {
    confidence,
    dataCompleteness: complete ? "SUFFICIENT" : "INSUFFICIENT",
    agreement,
    freshnessPenaltyApplied,
  };
}

module.exports = { computeConfidence, directionalAgreement };
