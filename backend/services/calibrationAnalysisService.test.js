require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const { getPrismaClient } = require("../db/prismaClient");
const calibrationAnalysisService = require("./calibrationAnalysisService");
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

async function createGradedOutcomeWithPrediction({ predictedConfidence, directionCorrect }) {
  const prisma = getPrismaClient();
  const record = await prisma.worldMemoryRecord.create({ data: { occurredAt: new Date(), symbols: ["NVDA"], sectors: [], headline: "NVDA event" } });
  const recommendation = await autonomousRecommendationRepository.createRecommendation(recommendationData());
  const prediction = await prisma.worldMemoryPrediction.create({ data: { worldMemoryRecordId: record.id, recommendationId: recommendation.id, predictedAction: "BUY", predictedConfidence } });
  return prisma.outcome.create({
    data: {
      recommendationId: recommendation.id,
      worldMemoryPredictionId: prediction.id,
      symbol: "NVDA",
      action: "BUY",
      timeWindow: "D1",
      windowStartPrice: 100,
      windowEndPrice: directionCorrect ? 110 : 90,
      windowReturnPct: directionCorrect ? 10 : -10,
      directionCorrect,
      gradeLabel: directionCorrect ? "CORRECT" : "INCORRECT",
      grade: directionCorrect ? 90 : 10,
      methodologyVersion: "v1",
      dataSourceSnapshot: {},
    },
  });
}

test("confidence distribution honestly reports insufficient data per bucket", async () => {
  await createGradedOutcomeWithPrediction({ predictedConfidence: 75, directionCorrect: true });
  const { buckets } = await calibrationAnalysisService.getConfidenceDistribution();
  const bucket = buckets.find((entry) => entry.bucket === "60-80");
  assert.equal(bucket.observedHitRate, null);
  assert.ok(bucket.reason);
});

test("confidence distribution computes a real observed hit rate once a bucket has enough samples", async () => {
  for (let i = 0; i < 5; i++) {
    await createGradedOutcomeWithPrediction({ predictedConfidence: 75, directionCorrect: i < 4 });
  }
  const { buckets } = await calibrationAnalysisService.getConfidenceDistribution();
  const bucket = buckets.find((entry) => entry.bucket === "60-80");
  assert.equal(bucket.sampleSize, 5);
  assert.equal(bucket.observedHitRate, 80);
});

test("calibration drift honestly reports insufficient data below 10 graded outcomes", async () => {
  const result = await calibrationAnalysisService.getCalibrationDrift();
  assert.equal(result.driftPts, null);
  assert.ok(result.reason);
});

test("calibration drift computes a real earlier-vs-later calibration error split", async () => {
  for (let i = 0; i < 20; i++) {
    await createGradedOutcomeWithPrediction({ predictedConfidence: 80, directionCorrect: i < 15 });
  }
  const result = await calibrationAnalysisService.getCalibrationDrift();
  assert.ok(Number.isFinite(result.earlierCalibrationError));
  assert.ok(Number.isFinite(result.laterCalibrationError));
  assert.equal(result.reason, null);
});

test("getCalibrationReport composes families, distribution, and drift together", async () => {
  const report = await calibrationAnalysisService.getCalibrationReport();
  assert.ok(Array.isArray(report.families));
  assert.ok(Array.isArray(report.confidenceDistribution));
  assert.ok(report.calibrationDrift);
});
