require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const { getPrismaClient } = require("../db/prismaClient");
const autonomousRecommendationRepository = require("./autonomousRecommendationRepository");
const worldMemoryRepository = require("./worldMemoryRepository");
const calibrationReportService = require("./calibrationReportService");

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
    reasoning: "Test.",
    evidence: {},
    portfolioContext: null,
    timeHorizon: "1-3 months",
    explanation: { thesis: "Test.", supportingEvidence: [], opposingEvidence: [], keyRisks: [], invalidationConditions: [], timeHorizon: "1-3 months", affectedPositions: [], affectedWatchlistSymbols: [], confidenceDrivers: [], confidenceReducers: [] },
    scenarios: [],
    qualityScore: 75,
    qualityComponents: {},
    ...overrides,
  };
}

async function seedGradedOutcome({ action = "BUY", predictedConfidence = 80, directionCorrect = true, gradedAt } = {}) {
  const recommendation = await autonomousRecommendationRepository.createRecommendation(recommendationData({ action }));
  const record = await worldMemoryRepository.createRecord({ canonicalEventId: null, occurredAt: new Date(), primaryThemeKey: null, symbols: [recommendation.symbol], sectors: [], headline: "Test" });
  const prisma = getPrismaClient();
  const prediction = await prisma.worldMemoryPrediction.create({
    data: { worldMemoryRecordId: record.id, recommendationId: recommendation.id, predictedAction: action, predictedConfidence },
  });
  const outcome = await prisma.outcome.create({
    data: {
      recommendationId: recommendation.id,
      worldMemoryPredictionId: prediction.id,
      symbol: recommendation.symbol,
      action,
      timeWindow: "D1",
      windowStartPrice: 100,
      directionCorrect,
      gradeLabel: directionCorrect ? "CORRECT" : "INCORRECT",
      methodologyVersion: "test-v1",
      dataSourceSnapshot: {},
      ...(gradedAt ? { gradedAt } : {}),
    },
  });
  return { recommendation, prediction, outcome };
}

test.beforeEach(async () => {
  await truncateAll();
});

test("computeCalibrationReports is honest about insufficient data below the minimum sample size", async () => {
  await seedGradedOutcome({ action: "BUY", directionCorrect: true });
  await seedGradedOutcome({ action: "BUY", directionCorrect: true });

  const report = await calibrationReportService.computeCalibrationReports();
  const buyFamily = report.families.find((f) => f.family === "BUY");
  assert.equal(buyFamily.isStatisticallyMeaningful, false);
  assert.equal(buyFamily.expectedConfidence, null);
  assert.equal(buyFamily.actualOutcomeHitRate, null);
  assert.match(buyFamily.insufficientDataMessage, /More observations required \(2 so far, need at least 5\)/);
});

test("computeCalibrationReports shows real expected confidence and actual hit rate once the sample is statistically meaningful", async () => {
  await seedGradedOutcome({ action: "BUY", predictedConfidence: 80, directionCorrect: true });
  await seedGradedOutcome({ action: "BUY", predictedConfidence: 80, directionCorrect: true });
  await seedGradedOutcome({ action: "BUY", predictedConfidence: 80, directionCorrect: true });
  await seedGradedOutcome({ action: "BUY", predictedConfidence: 80, directionCorrect: false });
  await seedGradedOutcome({ action: "BUY", predictedConfidence: 80, directionCorrect: false });

  const report = await calibrationReportService.computeCalibrationReports();
  const buyFamily = report.families.find((f) => f.family === "BUY");
  assert.equal(buyFamily.isStatisticallyMeaningful, true);
  assert.equal(buyFamily.sampleSize, 5);
  assert.equal(buyFamily.expectedConfidence, 80);
  assert.equal(buyFamily.actualOutcomeHitRate, 60);
  assert.equal(buyFamily.insufficientDataMessage, null);
});

test("computeCalibrationReports groups by real recommendation family (action), never mixing BUY and EXIT outcomes", async () => {
  await seedGradedOutcome({ action: "BUY", directionCorrect: true });
  await seedGradedOutcome({ action: "EXIT", directionCorrect: false });

  const report = await calibrationReportService.computeCalibrationReports();
  const families = report.families.map((f) => f.family).sort();
  assert.deepEqual(families, ["BUY", "EXIT"]);
});

test("computeCalibrationReports reports 'insufficient data for trend' below the minimum trend-half size, even with enough total samples", async () => {
  for (let i = 0; i < 5; i += 1) {
    await seedGradedOutcome({ action: "BUY", directionCorrect: true });
  }
  const report = await calibrationReportService.computeCalibrationReports();
  const buyFamily = report.families.find((f) => f.family === "BUY");
  assert.equal(buyFamily.calibrationTrend, "insufficient data for trend");
});

test("computeCalibrationReports detects a real improving trend between the earlier and recent half", async () => {
  for (let i = 0; i < 4; i += 1) {
    await seedGradedOutcome({ action: "BUY", directionCorrect: false });
  }
  for (let i = 0; i < 4; i += 1) {
    await seedGradedOutcome({ action: "BUY", directionCorrect: true });
  }

  const report = await calibrationReportService.computeCalibrationReports();
  const buyFamily = report.families.find((f) => f.family === "BUY");
  assert.equal(buyFamily.calibrationTrend, "improving");
  assert.equal(buyFamily.earlierHitRate, 0);
  assert.equal(buyFamily.recentHitRate, 100);
});

test("computeCalibrationReports never includes UNGRADEABLE outcomes in any family's sample", async () => {
  const recommendation = await autonomousRecommendationRepository.createRecommendation(recommendationData());
  const prisma = getPrismaClient();
  await prisma.outcome.create({
    data: {
      recommendationId: recommendation.id,
      symbol: recommendation.symbol,
      action: "BUY",
      timeWindow: "D1",
      windowStartPrice: 100,
      gradeLabel: "UNGRADEABLE",
      ungradeableReason: "No quote.",
      methodologyVersion: "test-v1",
      dataSourceSnapshot: {},
    },
  });

  const report = await calibrationReportService.computeCalibrationReports();
  assert.equal(report.families.length, 0, "an UNGRADEABLE-only outcome set should produce no families");
});
