require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const { getPrismaClient } = require("../db/prismaClient");
const dynamicSourceScoringService = require("./dynamicSourceScoringService");
const autonomousRecommendationRepository = require("./autonomousRecommendationRepository");
const autonomousMarketService = require("./autonomousMarketService");

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

test("falls back to the real static score with an honest reason when the sample is too thin", async () => {
  const prisma = getPrismaClient();
  await prisma.canonicalEvent.create({ data: canonicalEventData() });

  const result = await dynamicSourceScoringService.getDynamicCredibility("Reuters");
  assert.equal(result.isDynamic, false);
  assert.equal(result.value, autonomousMarketService.sourceQualityScore("Reuters"));
  assert.ok(result.reason);
});

test("every computation writes a real, immutable snapshot to the audit table", async () => {
  const prisma = getPrismaClient();
  await prisma.canonicalEvent.create({ data: canonicalEventData() });
  await dynamicSourceScoringService.computeAndSnapshotSourceScore("Reuters");
  await dynamicSourceScoringService.computeAndSnapshotSourceScore("Reuters");

  const history = await dynamicSourceScoringService.getSnapshotHistory("Reuters");
  assert.equal(history.length, 2);
});

test("computes a real false-negative rate for events with no downstream prediction", async () => {
  const prisma = getPrismaClient();
  await prisma.canonicalEvent.create({ data: canonicalEventData() }); // no WorldMemoryRecord at all

  const snapshot = await dynamicSourceScoringService.computeAndSnapshotSourceScore("Reuters");
  assert.equal(snapshot.falseNegativeRate, 1);
});

test("uses the real dynamic score once the sample is statistically meaningful, isolated per source", async () => {
  const prisma = getPrismaClient();

  for (let i = 0; i < 16; i++) {
    const canonicalEvent = await prisma.canonicalEvent.create({ data: canonicalEventData({ deduplicationKey: `dedup-${i}` }) });
    const record = await prisma.worldMemoryRecord.create({ data: { canonicalEventId: canonicalEvent.id, occurredAt: new Date(), symbols: ["NVDA"], sectors: [], headline: `Event ${i}` } });
    const recommendation = await autonomousRecommendationRepository.createRecommendation(recommendationData());
    const prediction = await prisma.worldMemoryPrediction.create({ data: { worldMemoryRecordId: record.id, recommendationId: recommendation.id, predictedAction: "BUY", predictedConfidence: 80 } });
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
  }

  const result = await dynamicSourceScoringService.getDynamicCredibility("Reuters");
  assert.equal(result.isDynamic, true);
  assert.equal(result.reason, null);
});

test("getSourceCredibilityOverrides builds a real map for multiple sources at once", async () => {
  const prisma = getPrismaClient();
  await prisma.canonicalEvent.create({ data: canonicalEventData({ sourceName: "Reuters" }) });
  await prisma.canonicalEvent.create({ data: canonicalEventData({ sourceName: "Bloomberg", deduplicationKey: `dedup-${Math.random()}` }) });

  const overrides = await dynamicSourceScoringService.getSourceCredibilityOverrides(["Reuters", "Bloomberg", null]);
  assert.ok(overrides.Reuters);
  assert.ok(overrides.Bloomberg);
});
