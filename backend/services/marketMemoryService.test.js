require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const { getPrismaClient } = require("../db/prismaClient");
const marketMemoryService = require("./marketMemoryService");
const autonomousRecommendationRepository = require("./autonomousRecommendationRepository");

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

test("honestly reports no symbols/sectors given", async () => {
  const result = await marketMemoryService.findSimilarHistory({});
  assert.deepEqual(result.matches, []);
  assert.ok(result.reason);
});

test("honestly reports no historical overlap when none exists", async () => {
  const prisma = getPrismaClient();
  await prisma.worldMemoryRecord.create({ data: { occurredAt: new Date(), symbols: ["AAPL"], sectors: [], headline: "AAPL event" } });
  const result = await marketMemoryService.findSimilarHistory({ symbols: ["NVDA"] });
  assert.deepEqual(result.matches, []);
  assert.ok(result.reason);
});

test("finds a real symbol-overlapping record with its real causal link and prediction/outcome", async () => {
  const prisma = getPrismaClient();
  const record = await prisma.worldMemoryRecord.create({ data: { occurredAt: new Date(), symbols: ["NVDA"], sectors: ["Technology"], headline: "NVDA earnings beat" } });
  await prisma.worldMemoryCausalLink.create({ data: { effectRecordId: record.id, explanation: "Earnings beat drove the rally.", confidence: 80, methodologyVersion: "v1" } });

  const recommendation = await autonomousRecommendationRepository.createRecommendation(recommendationData());
  const prediction = await prisma.worldMemoryPrediction.create({ data: { worldMemoryRecordId: record.id, recommendationId: recommendation.id, predictedAction: "BUY", predictedConfidence: 75 } });
  await prisma.outcome.create({
    data: {
      recommendationId: recommendation.id,
      worldMemoryPredictionId: prediction.id,
      symbol: "NVDA",
      action: "BUY",
      timeWindow: "D1",
      windowStartPrice: 100,
      windowEndPrice: 108,
      windowReturnPct: 8,
      directionCorrect: true,
      gradeLabel: "CORRECT",
      grade: 85,
      methodologyVersion: "v1",
      dataSourceSnapshot: {},
    },
  });

  const result = await marketMemoryService.findSimilarHistory({ symbols: ["NVDA"], sectors: ["Technology"] });
  assert.equal(result.matches.length, 1);
  assert.deepEqual(result.matches[0].matchedSymbols, ["NVDA"]);
  assert.equal(result.matches[0].previousCausalExplanations[0].explanation, "Earnings beat drove the rally.");
  assert.equal(result.matches[0].previousPredictions[0].previousOutcome.directionCorrect, true);
});

// Phase X11 — Part 4, Market Memory Evolution.
test("attaches the real, already-generated lesson for a graded outcome, and computes a real relevanceConfidence", async () => {
  const prisma = getPrismaClient();
  const record = await prisma.worldMemoryRecord.create({ data: { occurredAt: new Date(), symbols: ["NVDA"], sectors: ["Technology"], headline: "NVDA earnings beat" } });
  const recommendation = await autonomousRecommendationRepository.createRecommendation(recommendationData());
  const prediction = await prisma.worldMemoryPrediction.create({ data: { worldMemoryRecordId: record.id, recommendationId: recommendation.id, predictedAction: "BUY", predictedConfidence: 75 } });
  const outcome = await prisma.outcome.create({
    data: {
      recommendationId: recommendation.id,
      worldMemoryPredictionId: prediction.id,
      symbol: "NVDA",
      action: "BUY",
      timeWindow: "D1",
      windowStartPrice: 100,
      windowEndPrice: 108,
      windowReturnPct: 8,
      directionCorrect: true,
      gradeLabel: "CORRECT",
      grade: 85,
      methodologyVersion: "v1",
      dataSourceSnapshot: {},
    },
  });
  await prisma.worldMemoryLesson.create({ data: { outcomeId: outcome.id, lessonText: "NVDA (BUY): confirmed the thesis.", methodologyVersion: "v1" } });

  const result = await marketMemoryService.findSimilarHistory({ symbols: ["NVDA"], sectors: ["Technology"] });
  assert.equal(result.matches[0].previousPredictions[0].previousLesson, "NVDA (BUY): confirmed the thesis.");
  assert.ok(result.matches[0].relevanceConfidence > 0);
  assert.deepEqual(result.mostRelevant, result.matches[0]);
});

test("relevanceConfidence honestly reflects an ungraded match as lower certainty than a graded one", async () => {
  const prisma = getPrismaClient();
  const gradedRecord = await prisma.worldMemoryRecord.create({ data: { occurredAt: new Date(), symbols: ["NVDA", "AMD"], sectors: ["Technology"], headline: "Chip sector rally" } });
  const ungradedRecord = await prisma.worldMemoryRecord.create({ data: { occurredAt: new Date(), symbols: ["NVDA"], sectors: [], headline: "NVDA minor news" } });

  const recommendation = await autonomousRecommendationRepository.createRecommendation(recommendationData());
  const gradedPrediction = await prisma.worldMemoryPrediction.create({ data: { worldMemoryRecordId: gradedRecord.id, recommendationId: recommendation.id, predictedAction: "BUY", predictedConfidence: 75 } });
  await prisma.outcome.create({
    data: {
      recommendationId: recommendation.id,
      worldMemoryPredictionId: gradedPrediction.id,
      symbol: "NVDA",
      action: "BUY",
      timeWindow: "D1",
      windowStartPrice: 100,
      windowEndPrice: 108,
      windowReturnPct: 8,
      directionCorrect: true,
      gradeLabel: "CORRECT",
      grade: 85,
      methodologyVersion: "v1",
      dataSourceSnapshot: {},
    },
  });

  const result = await marketMemoryService.findSimilarHistory({ symbols: ["NVDA"], sectors: ["Technology"] });
  const gradedMatch = result.matches.find((match) => match.recordId === gradedRecord.id);
  const ungradedMatch = result.matches.find((match) => match.recordId === ungradedRecord.id);
  assert.ok(gradedMatch.relevanceConfidence > ungradedMatch.relevanceConfidence);
});
