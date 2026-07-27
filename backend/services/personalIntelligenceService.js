// Sprint 30 — Personal Intelligence Layer, Priority 2. "Use only existing
// evidence. Rank recommendations by user relevance. Never change facts.
// Only change ordering and presentation." Every input here is either
// already-computed Recommendation data or a real read of User Memory
// (Sprint 30 Priority 1) / InvestorProfile (existing) — no new scoring
// model invented, no field on the recommendation is ever mutated. This
// mirrors feedPersonalizationService.rankFeedForInvestor's own precedent
// (Sprint 20, "changes weighting, never truth") and reuses its
// computeProfileWeight directly rather than writing a second profile-
// weighting function.
const userMemoryRepository = require("./userMemoryRepository");
const feedPersonalizationService = require("./feedPersonalizationService");

const SECTOR_FAVORITE_BOOST = 15;
const SECTOR_IGNORED_PENALTY = 10;
const VIEW_BOOST_PER_VIEW = 5;
const VIEW_BOOST_CAP = 15;

function toFeedLikeShape(recommendation) {
  return {
    impactType: recommendation.action === "BUY" ? "opportunity" : recommendation.action === "EXIT" || recommendation.action === "REDUCE" ? "risk" : "neutral",
    timeHorizon: recommendation.timeHorizon,
    whyItMatters: recommendation.reasoning,
  };
}

function computeRelevanceScore(recommendation, { favoriteSectorSet, ignoredSectorSet, viewCounts, investorProfile }) {
  let score = 0;
  const sector = recommendation.portfolioContext?.sector || null;
  if (sector && favoriteSectorSet.has(sector)) score += SECTOR_FAVORITE_BOOST;
  if (sector && ignoredSectorSet.has(sector)) score -= SECTOR_IGNORED_PENALTY;

  const views = viewCounts.get(recommendation.symbol) || 0;
  score += Math.min(views * VIEW_BOOST_PER_VIEW, VIEW_BOOST_CAP);

  if (investorProfile) {
    score += feedPersonalizationService.computeProfileWeight(toFeedLikeShape(recommendation), investorProfile);
  }

  return score;
}

/**
 * Stable re-sort, same discipline as rankFeedForInvestor: only reorders
 * by the added relevance score, preserving the input's existing relative
 * order (e.g. qualityScore rank) among recommendations with an equal
 * score. An empty or single-item list is returned as-is, no extra work.
 */
async function rankByUserRelevance(recommendations, { investorProfile = null, betaUserId = null } = {}) {
  if (!Array.isArray(recommendations) || recommendations.length <= 1) {
    return recommendations || [];
  }

  // Phase PERSONALIZATION-PRIVACY-001 — userMemoryRepository now requires
  // a real betaUserId per read (never a cross-user blend); without one,
  // these two calls honestly return "no view/sector history" rather than
  // erroring, so a caller that hasn't threaded an identity through yet
  // (see PERSONALIZATION_PRIVACY_REPORT.md) still gets a safe, honest
  // "no memory-based boost" result instead of a crash or a leak.
  const candidateSectors = recommendations.map((rec) => rec.portfolioContext?.sector).filter(Boolean);
  const [sectorSummary, viewCounts] = await Promise.all([
    userMemoryRepository.getSectorInterestSummary({ candidateSectors, betaUserId }),
    userMemoryRepository.getRecommendationViewCounts({ betaUserId }),
  ]);
  const favoriteSectorSet = new Set(sectorSummary.favoriteSectors.map((entry) => entry.sector));
  const ignoredSectorSet = new Set(sectorSummary.ignoredSectors);

  return recommendations
    .map((rec, index) => ({
      rec,
      index,
      relevanceScore: computeRelevanceScore(rec, { favoriteSectorSet, ignoredSectorSet, viewCounts, investorProfile }),
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore || a.index - b.index)
    .map((entry) => entry.rec);
}

module.exports = {
  rankByUserRelevance,
  computeRelevanceScore,
};
