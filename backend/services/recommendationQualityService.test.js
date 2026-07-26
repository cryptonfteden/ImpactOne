require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const { getPrismaClient } = require("../db/prismaClient");
const autonomousRecommendationRepository = require("./autonomousRecommendationRepository");
const recommendationQualityService = require("./recommendationQualityService");
const analyticsService = require("./analyticsService");

test.beforeEach(async () => {
  await truncateAll();
});

function recommendationData(overrides = {}) {
  return {
    symbol: "NVDA",
    action: "BUY",
    confidenceScore: 80,
    expectedUpside: "10-15%",
    expectedDownside: "-6%",
    riskScore: 30,
    riskLabel: "Low",
    positionSizeSuggestion: "2-4%",
    reasoning: "Test reasoning.",
    evidence: { currentPrice: 100 },
    portfolioContext: null,
    timeHorizon: "1-3 months",
    explanation: { thesis: "Test thesis.", supportingEvidence: [], opposingEvidence: [], keyRisks: [], invalidationConditions: [], timeHorizon: "1-3 months", affectedPositions: [], affectedWatchlistSymbols: [], confidenceDrivers: [], confidenceReducers: [] },
    scenarios: [],
    qualityScore: 75,
    qualityComponents: {},
    ...overrides,
  };
}

test("requires a real recommendationId", async () => {
  await assert.rejects(() => recommendationQualityService.getRecommendationQuality(null), (error) => error.statusCode === 400);
});

test("404s for a recommendation that doesn't exist", async () => {
  await assert.rejects(() => recommendationQualityService.getRecommendationQuality("missing-id"), (error) => error.statusCode === 404);
});

test("a recommendation with no engagement or outcome signal is honestly UNKNOWN", async () => {
  const recommendation = await autonomousRecommendationRepository.createRecommendation(recommendationData());
  const quality = await recommendationQualityService.getRecommendationQuality(recommendation.id);
  assert.equal(quality.engagementStatus, "UNKNOWN");
  assert.equal(quality.outcomeStatus, "UNKNOWN");
});

test("a viewed-but-not-opened recommendation is IGNORED", async () => {
  const recommendation = await autonomousRecommendationRepository.createRecommendation(recommendationData());
  await analyticsService.recordEvent({ eventName: "recommendation_viewed", betaUserId: "beta-1", properties: { recommendationId: recommendation.id, symbol: "NVDA" } });
  const quality = await recommendationQualityService.getRecommendationQuality(recommendation.id);
  assert.equal(quality.engagementStatus, "IGNORED");
});

test("a watchlisted recommendation is WATCHLISTED even if also viewed", async () => {
  const recommendation = await autonomousRecommendationRepository.createRecommendation(recommendationData());
  await analyticsService.recordEvent({ eventName: "recommendation_viewed", betaUserId: "beta-1", properties: { recommendationId: recommendation.id, symbol: "NVDA" } });
  await analyticsService.recordEvent({ eventName: "symbol_watchlisted", betaUserId: "beta-1", properties: { recommendationId: recommendation.id, symbol: "NVDA" } });
  const quality = await recommendationQualityService.getRecommendationQuality(recommendation.id);
  assert.equal(quality.engagementStatus, "WATCHLISTED");
});

test("an outcome's real directionCorrect maps to CORRECT/INCORRECT", async () => {
  const recommendation = await autonomousRecommendationRepository.createRecommendation(recommendationData());
  const prisma = getPrismaClient();
  await prisma.outcome.create({
    data: {
      recommendationId: recommendation.id,
      symbol: "NVDA",
      action: "BUY",
      timeWindow: "D1",
      windowStartPrice: 100,
      windowEndPrice: 110,
      windowReturnPct: 10,
      directionCorrect: true,
      gradeLabel: "CORRECT",
      grade: 90,
      methodologyVersion: "v1",
      dataSourceSnapshot: {},
    },
  });
  const quality = await recommendationQualityService.getRecommendationQuality(recommendation.id);
  assert.equal(quality.outcomeStatus, "CORRECT");
});

test("model confidence score honestly reports zero graded outcomes", async () => {
  const result = await recommendationQualityService.getModelConfidenceScore();
  assert.equal(result.sampleSizes.gradedOutcomes, 0);
  assert.ok(result.reason);
});
