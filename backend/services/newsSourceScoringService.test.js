require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const { getPrismaClient } = require("../db/prismaClient");
const newsSourceScoringService = require("./newsSourceScoringService");
const autonomousRecommendationRepository = require("./autonomousRecommendationRepository");
const analyticsService = require("./analyticsService");

test.beforeEach(async () => {
  await truncateAll();
});

function canonicalEventData(overrides = {}) {
  return {
    providerId: "test-provider",
    eventType: "NEWS",
    sourceType: "NEWS",
    sourceName: "Reuters",
    publishedAt: new Date(Date.now() - 60 * 60 * 1000),
    entities: {},
    symbols: ["NVDA"],
    sectors: [],
    countries: [],
    companies: [],
    themes: [],
    language: "en",
    category: "markets",
    summary: "Test event.",
    credibilityScore: 90,
    deduplicationKey: `dedup-${Math.random()}`,
    ...overrides,
  };
}

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

test("requires a real sourceName", async () => {
  await assert.rejects(() => newsSourceScoringService.getSourceScore(null), (error) => error.statusCode === 400);
});

test("a source with no graded outcomes gets an honest, incomplete score with a real reason", async () => {
  const prisma = getPrismaClient();
  await prisma.canonicalEvent.create({ data: canonicalEventData({ credibilityScore: null }) });
  const score = await newsSourceScoringService.getSourceScore("Reuters");
  assert.equal(score.trustScore, null);
  assert.ok(score.trustScoreReason);
  assert.equal(score.predictionQualitySampleSize, 0);
});

test("a source with a real, graded, correct prediction gets a real trust score", async () => {
  const prisma = getPrismaClient();
  const canonicalEvent = await prisma.canonicalEvent.create({ data: canonicalEventData() });
  const record = await prisma.worldMemoryRecord.create({
    data: { canonicalEventId: canonicalEvent.id, occurredAt: new Date(), symbols: ["NVDA"], sectors: [], headline: "NVDA moves" },
  });
  const recommendation = await autonomousRecommendationRepository.createRecommendation(recommendationData());
  const prediction = await prisma.worldMemoryPrediction.create({
    data: { worldMemoryRecordId: record.id, recommendationId: recommendation.id, predictedAction: "BUY", predictedConfidence: 80 },
  });
  await prisma.outcome.create({
    data: {
      recommendationId: recommendation.id,
      worldMemoryPredictionId: prediction.id,
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

  const score = await newsSourceScoringService.getSourceScore("Reuters");
  assert.equal(score.accuracyRate, 1);
  assert.equal(score.falsePositiveRate, 0);
  assert.equal(score.predictionQualitySampleSize, 1);
  assert.ok(score.trustScore > 0);
});

test("real user engagement events for a source are counted, isolated per source", async () => {
  const prisma = getPrismaClient();
  await prisma.canonicalEvent.create({ data: canonicalEventData({ credibilityScore: null }) });
  await analyticsService.recordEvent({ eventName: "recommendation_expanded", betaUserId: "beta-1", properties: { sourceName: "Reuters" } });
  await analyticsService.recordEvent({ eventName: "recommendation_expanded", betaUserId: "beta-1", properties: { sourceName: "Bloomberg" } });

  const score = await newsSourceScoringService.getSourceScore("Reuters");
  assert.equal(score.userEngagementEventCount, 1);
});

test("listSourceScores returns every real ingested source, sorted by trust score", async () => {
  const prisma = getPrismaClient();
  await prisma.canonicalEvent.create({ data: canonicalEventData({ sourceName: "Reuters", credibilityScore: 90 }) });
  await prisma.canonicalEvent.create({ data: canonicalEventData({ sourceName: "RandomBlog", credibilityScore: 20, deduplicationKey: `dedup-${Math.random()}` }) });

  const scores = await newsSourceScoringService.listSourceScores();
  assert.equal(scores.length, 2);
  assert.equal(scores[0].sourceName, "Reuters");
});
