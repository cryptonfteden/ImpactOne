// Phase VALUATION-AGENT-001 — implements VALUATION_SCORING_MODEL.md §1's
// exact 4-component confidence formula. Every sub-score is a disclosed,
// hand-set formula (never a fitted/opaque weight), consistent with
// optionsAnomalyConfidence.js's established convention on this platform.
//
//   valuationConfidence = dataCompletenessScore * 0.30
//                       + methodAgreementScore   * 0.30
//                       + peerGroupQualityScore  * 0.25
//                       + earningsQualityScore   * 0.15
const MINIMUM_HEALTHY_PEER_GROUP_SIZE = 8; // §1.2.3's proposed 8-10 floor
const SINGLE_METHOD_AGREEMENT_SCORE = 40; // §1.2.2's disclosed fixed value when only 1 usable method exists
const COV_SCALING_CONSTANT = 200; // §1.2.2's disclosed, hand-set scaling constant

function average(numbers) {
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

function stdDev(numbers) {
  if (numbers.length < 2) return 0;
  const mean = average(numbers);
  return Math.sqrt(average(numbers.map((n) => (n - mean) ** 2)));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/** §1.2.1 — the denominator is "how many methods are structurally applicable," not a fixed 7. */
function computeDataCompletenessScore(usableMethodCount, totalApplicableMethodCount) {
  if (totalApplicableMethodCount === 0) return 0;
  return Math.round((usableMethodCount / totalApplicableMethodCount) * 100);
}

/** §1.2.2 */
function computeMethodAgreementScore(impliedPrices) {
  if (impliedPrices.length === 0) return 0;
  if (impliedPrices.length === 1) return SINGLE_METHOD_AGREEMENT_SCORE;
  const mean = average(impliedPrices);
  if (mean <= 0) return 0;
  const coefficientOfVariation = stdDev(impliedPrices) / mean;
  return Math.round(clamp(100 - coefficientOfVariation * COV_SCALING_CONSTANT, 0, 100));
}

/** §1.2.3 */
function computePeerGroupQualityScore(peerGroupSize, minimumHealthySize = MINIMUM_HEALTHY_PEER_GROUP_SIZE) {
  return Math.round(clamp((peerGroupSize / minimumHealthySize) * 100, 0, 100));
}

/**
 * §1.2.4 — this platform has no data source for `largeOneTimeItemFlag`/
 * `gaapAdjustedEpsDivergenceFlag` yet (disclosed limitation, see
 * VALUATION_AGENT.md); only `negativeEarningsFlag` is real and computed
 * directly from the metrics this agent already has.
 */
function computeEarningsQualityScore({ negativeEarningsFlag = false, largeOneTimeItemFlag = false, gaapAdjustedEpsDivergenceFlag = false } = {}) {
  let score = 100;
  if (largeOneTimeItemFlag) score -= 30;
  if (gaapAdjustedEpsDivergenceFlag) score -= 20;
  if (negativeEarningsFlag) score -= 10;
  return clamp(score, 0, 100);
}

/**
 * @returns {{ valuationConfidence: number, components: object }}
 */
function computeValuationConfidence({ usableMethodCount, totalApplicableMethodCount, impliedPrices, peerGroupSize, earningsQualityFlags }) {
  const dataCompletenessScore = computeDataCompletenessScore(usableMethodCount, totalApplicableMethodCount);
  const methodAgreementScore = computeMethodAgreementScore(impliedPrices);
  const peerGroupQualityScore = computePeerGroupQualityScore(peerGroupSize);
  const earningsQualityScore = computeEarningsQualityScore(earningsQualityFlags);

  const valuationConfidence = Math.round(dataCompletenessScore * 0.3 + methodAgreementScore * 0.3 + peerGroupQualityScore * 0.25 + earningsQualityScore * 0.15);

  return {
    valuationConfidence: clamp(valuationConfidence, 0, 100),
    components: { dataCompletenessScore, methodAgreementScore, peerGroupQualityScore, earningsQualityScore },
  };
}

module.exports = {
  computeValuationConfidence,
  computeDataCompletenessScore,
  computeMethodAgreementScore,
  computePeerGroupQualityScore,
  computeEarningsQualityScore,
  MINIMUM_HEALTHY_PEER_GROUP_SIZE,
  SINGLE_METHOD_AGREEMENT_SCORE,
  COV_SCALING_CONSTANT,
};
