// Phase X10 — Part 7, AI Performance Dashboard. Pure composition over the
// real systems built across this phase and earlier sprints — no new
// scoring model. Recommendation accuracy/confidence calibration reuse
// qualityDashboardService.js (Sprint 29) unchanged; source quality reuses
// Part 4; engagement/learning-progress reuse Part 1's real AnalyticsEvent
// substrate; model drift is the one genuinely new computation here (a
// real split-window hit-rate comparison over Outcome.gradedAt).
const { getPrismaClient } = require("../db/prismaClient");
const qualityDashboardService = require("./qualityDashboardService");
const newsSourceScoringService = require("./newsSourceScoringService");

function average(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function hitRateOf(outcomes) {
  const graded = outcomes.filter((outcome) => outcome.directionCorrect !== null);
  if (!graded.length) return null;
  const correct = graded.filter((outcome) => outcome.directionCorrect === true).length;
  return Math.round((correct / graded.length) * 100);
}

// Real drift signal: hit rate in the earlier half of graded history vs.
// the later half, split at the real median gradedAt — never a fabricated
// trend when there isn't enough graded history to split meaningfully.
async function computeModelDrift() {
  const prisma = getPrismaClient();
  const outcomes = await prisma.outcome.findMany({ orderBy: { gradedAt: "asc" }, select: { directionCorrect: true, gradedAt: true } });
  const graded = outcomes.filter((outcome) => outcome.directionCorrect !== null);
  if (graded.length < 10) {
    return { earlierHitRate: null, laterHitRate: null, driftPts: null, reason: `Only ${graded.length} graded outcomes — need at least 10 to measure drift.` };
  }
  const midpoint = Math.floor(graded.length / 2);
  const earlierHitRate = hitRateOf(graded.slice(0, midpoint));
  const laterHitRate = hitRateOf(graded.slice(midpoint));
  return {
    earlierHitRate,
    laterHitRate,
    driftPts: earlierHitRate === null || laterHitRate === null ? null : laterHitRate - earlierHitRate,
    reason: null,
  };
}

async function computeSourceQualitySummary() {
  const scores = await newsSourceScoringService.listSourceScores();
  const withTrustScore = scores.filter((score) => score.trustScore !== null);
  return {
    totalSources: scores.length,
    avgTrustScore: withTrustScore.length ? Math.round(average(withTrustScore.map((score) => score.trustScore))) : null,
    topSources: scores.slice(0, 3).map((score) => ({ sourceName: score.sourceName, trustScore: score.trustScore })),
  };
}

async function computeEngagementSummary() {
  const prisma = getPrismaClient();
  const [totalEvents, distinctUsers, recommendationsSaved, recommendationsDismissed] = await Promise.all([
    prisma.analyticsEvent.count(),
    prisma.analyticsEvent.findMany({ where: { betaUserId: { not: null } }, select: { betaUserId: true }, distinct: ["betaUserId"] }),
    prisma.analyticsEvent.count({ where: { eventName: "recommendation_saved" } }),
    prisma.analyticsEvent.count({ where: { eventName: "recommendation_dismissed" } }),
  ]);
  return {
    totalInteractions: totalEvents,
    activeUsers: distinctUsers.length,
    recommendationsSaved,
    recommendationsDismissed,
  };
}

// Real, coarse coverage metric — what fraction of real investor profiles
// have every field the Personalization Engine (Part 2) actually reads.
async function computePersonalizationQuality() {
  const prisma = getPrismaClient();
  const profiles = await prisma.investorProfile.findMany({ select: { riskTolerance: true, investmentHorizon: true } });
  if (!profiles.length) return { coverageRate: null, reason: "No investor profiles created yet." };
  const complete = profiles.filter((profile) => profile.riskTolerance && profile.investmentHorizon).length;
  return { coverageRate: Math.round((complete / profiles.length) * 100), sampleSize: profiles.length, reason: null };
}

async function getAiPerformanceDashboard() {
  const [qualityDashboard, sourceQuality, engagement, personalizationQuality, modelDrift] = await Promise.all([
    qualityDashboardService.computeQualityDashboard(),
    computeSourceQualitySummary(),
    computeEngagementSummary(),
    computePersonalizationQuality(),
    computeModelDrift(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    recommendationAccuracy: { hitRate: qualityDashboard.hitRate, sampleSizes: qualityDashboard.sampleSizes },
    confidenceCalibration: qualityDashboard.confidenceCalibration,
    sourceQuality,
    userEngagement: engagement,
    personalizationQuality,
    modelDrift,
    learningProgress: {
      totalGradedOutcomes: qualityDashboard.sampleSizes.gradedOutcomes,
      outcomeCompletion: qualityDashboard.outcomeCompletion,
    },
  };
}

module.exports = { getAiPerformanceDashboard };
