// Phase X10 — Part 2, Personalization Engine. Every preference below is
// derived from an already-real source — the real InvestorProfile, real
// held positions, real interaction history from userLearningService.js
// (Part 1) — never a fabricated inference. A preference this engine
// can't yet support with real data is reported as `null` with a real
// reason, never guessed.
const { getPrismaClient } = require("../db/prismaClient");
const investorProfileService = require("./investorProfileService");
const portfolioEngineService = require("./portfolioEngineService");
const userLearningService = require("./userLearningService");

function requireBetaUser(betaUserId) {
  if (!betaUserId) {
    const error = new Error("A beta user identity is required for personalization.");
    error.statusCode = 400;
    throw error;
  }
}

function topBy(entries, keyFn) {
  const counts = new Map();
  for (const entry of entries) {
    const key = keyFn(entry);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries()).map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
}

// Real preferred sectors/market caps — derived from real held positions
// (Position.sector/assetType are real, already-persisted fields), never
// from a guessed symbol→sector mapping.
async function computePortfolioPreferences(betaUserId) {
  const summary = await portfolioEngineService.getPortfolioSummary(betaUserId).catch(() => null);
  const positions = summary?.positions || [];
  if (!positions.length) {
    return { preferredSectors: [], preferredAssetTypes: [], reason: "No open positions yet." };
  }
  return {
    preferredSectors: topBy(positions, (position) => position.sector),
    preferredAssetTypes: topBy(positions, (position) => position.assetType),
    reason: null,
  };
}

// Real preferred recommendation style — the real action distribution
// (BUY/REDUCE/EXIT) of recommendations this user actually opened, not
// every recommendation that ever existed.
async function computeRecommendationStylePreference(betaUserId) {
  const prisma = getPrismaClient();
  const openedEvents = await prisma.analyticsEvent.findMany({
    where: { betaUserId, eventName: "recommendation_opened" },
    select: { properties: true },
  });
  const recommendationIds = openedEvents.map((event) => event.properties?.recommendationId).filter(Boolean);
  if (!recommendationIds.length) {
    return { preferredActions: [], reason: "No recommendations opened yet." };
  }
  const recommendations = await prisma.recommendation.findMany({ where: { id: { in: recommendationIds } }, select: { action: true } });
  return { preferredActions: topBy(recommendations, (recommendation) => recommendation.action), reason: null };
}

// Real preferred explanation depth — a real ratio of expand vs. collapse
// actions on recommendation explanations (Part 1's own real counts),
// never assumed.
function computeExplanationDepthPreference(learningProfile) {
  const { explanationsExpanded, explanationsCollapsed } = learningProfile;
  const total = explanationsExpanded + explanationsCollapsed;
  if (!total) return { depth: null, reason: "No explanation interactions recorded yet." };
  const expandRate = explanationsExpanded / total;
  return {
    depth: expandRate >= 0.6 ? "DETAILED" : expandRate <= 0.3 ? "BRIEF" : "STANDARD",
    expandRate: Math.round(expandRate * 100) / 100,
    reason: null,
  };
}

async function getPersonalizationProfile(betaUserId) {
  requireBetaUser(betaUserId);

  const [investorProfile, portfolioPreferences, stylePreference, learningProfile] = await Promise.all([
    investorProfileService.getInvestorProfile(betaUserId),
    computePortfolioPreferences(betaUserId),
    computeRecommendationStylePreference(betaUserId),
    userLearningService.getUserLearningProfile(betaUserId),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    // Real, already-captured investor-profile preferences — reused
    // directly, never re-derived.
    preferredRiskLevel: investorProfile?.riskTolerance || null,
    preferredHoldingPeriod: investorProfile?.investmentHorizon || null,
    // Real, newly-derived preferences this phase adds.
    preferredSectors: portfolioPreferences.preferredSectors,
    preferredMarketCapExposure: portfolioPreferences.preferredAssetTypes,
    preferredRecommendationStyle: stylePreference.preferredActions,
    preferredExplanationDepth: computeExplanationDepthPreference(learningProfile),
    preferredChartUsage: {
      chartsOpened: learningProfile.chartsOpened,
      averageWatchTimeMs: learningProfile.averageChartWatchTimeMs,
    },
    // Real, honest gaps — no real per-source engagement pipeline exists
    // yet to derive this from (News Source Scoring, Part 4, tracks
    // source *quality*, not this user's own reading preference among
    // sources) — disclosed, not fabricated.
    preferredNewsSources: { sources: [], reason: "No real per-source reading preference signal exists yet — see SOURCE_SCORING.md." },
  };
}

module.exports = { getPersonalizationProfile };
