// Phase NEWS-AGENT-001 — "Multi-source confirmation" → "Confirmation
// Score" (0-100). Reuses SENTIMENT-AGENT-001's own real
// `analyzeSourceQuality()` (per this mission's "reuse existing news
// infrastructure wherever possible") for the real distinct-source count
// and real tier-1 credibility share, then combines them into a
// disclosed weighted Confirmation Score: real source diversity matters
// as much as real source credibility for "is this actually confirmed
// news, not a single unverified report" — never a naive average of
// unrelated metrics.
const { analyzeSourceQuality } = require("../sentimentAgent/sourceQualityAnalyzer");

const CREDIBILITY_WEIGHT = 0.5;
const DIVERSITY_WEIGHT = 0.5;
const DIVERSITY_CEILING = 5; // 5+ distinct real sources maps to a full real diversity score

/**
 * @param {Array<{source:string}>} articles - real articles
 * @returns {{ confirmationScore: number, distinctSourceCount: number, credibilityScore: number }}
 */
function analyzeConfirmation(articles) {
  if (!articles.length) {
    return { confirmationScore: 0, distinctSourceCount: 0, credibilityScore: 0 };
  }

  const { distinctSourceCount, credibilityScore } = analyzeSourceQuality(articles);
  const diversityScore = Math.min(100, Math.round((distinctSourceCount / DIVERSITY_CEILING) * 100));
  const confirmationScore = Math.round(credibilityScore * CREDIBILITY_WEIGHT + diversityScore * DIVERSITY_WEIGHT);

  return { confirmationScore, distinctSourceCount, credibilityScore };
}

module.exports = { analyzeConfirmation, CREDIBILITY_WEIGHT, DIVERSITY_WEIGHT, DIVERSITY_CEILING };
