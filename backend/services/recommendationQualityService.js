// Phase X10 — Part 3, Recommendation Quality Engine. Composes three
// already-real systems — RecommendationLifecycleEvent (Sprint 42),
// AnalyticsEvent (Sprint 35/X9/X10), and Outcome (Sprint 16D onward) —
// into the mission's required per-recommendation vocabulary. No new
// scoring model: "confidence score" reuses qualityDashboardService's
// existing, real confidence-calibration computation rather than
// reinventing it.
const { getPrismaClient } = require("../db/prismaClient");
const qualityDashboardService = require("./qualityDashboardService");

// Real engagement status, derived from real signals in a fixed priority
// order — the strongest real signal wins, never averaged/guessed.
function deriveEngagementStatus({ lifecycleStates, analyticsEventNames }) {
  if (lifecycleStates.has("EXPIRED")) return "EXPIRED";
  if (lifecycleStates.has("PAPER_TRADED")) return "BOUGHT";
  if (analyticsEventNames.has("symbol_watchlisted")) return "WATCHLISTED";
  if (analyticsEventNames.has("recommendation_opened") || lifecycleStates.has("VIEWED")) return "OPENED";
  if (analyticsEventNames.has("recommendation_viewed")) return "IGNORED";
  return "UNKNOWN";
}

function deriveOutcomeStatus(outcome) {
  if (!outcome || outcome.directionCorrect === null || outcome.directionCorrect === undefined) return "UNKNOWN";
  return outcome.directionCorrect ? "CORRECT" : "INCORRECT";
}

async function getRecommendationQuality(recommendationId) {
  if (!recommendationId) {
    const error = new Error("A recommendationId is required.");
    error.statusCode = 400;
    throw error;
  }
  const prisma = getPrismaClient();
  const [recommendation, lifecycleEvents, analyticsEvents, outcome] = await Promise.all([
    prisma.recommendation.findUnique({ where: { id: recommendationId } }),
    prisma.recommendationLifecycleEvent.findMany({ where: { recommendationId } }),
    prisma.analyticsEvent.findMany({ where: { properties: { path: ["recommendationId"], equals: recommendationId } } }),
    prisma.outcome.findFirst({ where: { recommendationId }, orderBy: { gradedAt: "desc" } }),
  ]);

  if (!recommendation) {
    const error = new Error(`No recommendation found for id ${recommendationId}.`);
    error.statusCode = 404;
    throw error;
  }

  const lifecycleStates = new Set(lifecycleEvents.map((event) => event.state));
  const analyticsEventNames = new Set(analyticsEvents.map((event) => event.eventName));

  return {
    recommendationId,
    symbol: recommendation.symbol,
    action: recommendation.action,
    engagementStatus: deriveEngagementStatus({ lifecycleStates, analyticsEventNames }),
    outcomeStatus: deriveOutcomeStatus(outcome),
    grade: outcome ? outcome.gradeLabel : null,
    directionCorrect: outcome ? outcome.directionCorrect : null,
    // The model's own stated confidence at generation time — real, already
    // persisted, not recomputed.
    modelConfidenceScore: Number(recommendation.qualityScore),
  };
}

// Real, aggregate confidence score "for every recommendation model" —
// reuses the existing real calibration engine rather than building a
// second one.
async function getModelConfidenceScore() {
  const dashboard = await qualityDashboardService.computeQualityDashboard();
  return {
    hitRate: dashboard.hitRate,
    confidenceCalibration: dashboard.confidenceCalibration,
    sampleSizes: dashboard.sampleSizes,
    reason: dashboard.sampleSizes.gradedOutcomes === 0 ? "No graded outcomes yet — calibration cannot be computed." : null,
  };
}

module.exports = { getRecommendationQuality, getModelConfidenceScore };
