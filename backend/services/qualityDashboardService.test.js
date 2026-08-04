require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const { getPrismaClient } = require("../db/prismaClient");
const autonomousRecommendationRepository = require("./autonomousRecommendationRepository");
const worldMemoryRepository = require("./worldMemoryRepository");
const qualityDashboardService = require("./qualityDashboardService");

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

async function seedGradedOutcome({ predictedConfidence = 80, directionCorrect = true, gradeLabel = "CORRECT", createdAt, gradedAt } = {}) {
  const prisma = getPrismaClient();
  const recommendation = await autonomousRecommendationRepository.createRecommendation(recommendationData());
  if (createdAt) {
    await prisma.recommendation.update({ where: { id: recommendation.id }, data: { createdAt } });
  }
  const record = await worldMemoryRepository.createRecord({
    canonicalEventId: null,
    occurredAt: new Date(),
    primaryThemeKey: null,
    symbols: [recommendation.symbol],
    sectors: [],
    headline: "Test",
  });
  const prediction = await worldMemoryRepository.createPrediction({
    worldMemoryRecordId: record.id,
    recommendationId: recommendation.id,
    predictedAction: "BUY",
    predictedConfidence,
  });
  const outcome = await worldMemoryRepository.createOutcome({
    recommendationId: recommendation.id,
    worldMemoryPredictionId: prediction.id,
    symbol: recommendation.symbol,
    action: "BUY",
    timeWindow: "D1",
    windowStartPrice: 100,
    windowEndPrice: directionCorrect ? 110 : 90,
    windowReturnPct: directionCorrect ? 10 : -10,
    directionCorrect,
    grade: 80,
    gradeLabel,
    methodologyVersion: "test-v1",
    dataSourceSnapshot: {},
    ...(gradedAt ? { gradedAt } : {}),
  });
  return { recommendation, prediction, outcome };
}

test.beforeEach(async () => {
  await truncateAll();
});

test("computeQualityDashboard is honest about null metrics when there is no data at all", async () => {
  const dashboard = await qualityDashboardService.computeQualityDashboard();
  assert.equal(dashboard.hitRate, null);
  assert.equal(dashboard.confidenceCalibration, null);
  assert.equal(dashboard.avgHoldingPeriodHours, null);
  assert.equal(dashboard.avgUncertainty, null);
  assert.equal(dashboard.outcomeCompletion, null);
});

test("hitRate is the real fraction of graded outcomes with directionCorrect true, ignoring UNGRADEABLE", async () => {
  await seedGradedOutcome({ directionCorrect: true, gradeLabel: "CORRECT" });
  await seedGradedOutcome({ directionCorrect: true, gradeLabel: "CORRECT" });
  await seedGradedOutcome({ directionCorrect: false, gradeLabel: "INCORRECT" });
  const prisma = getPrismaClient();
  const recommendation = await autonomousRecommendationRepository.createRecommendation(recommendationData());
  const record = await worldMemoryRepository.createRecord({ canonicalEventId: null, occurredAt: new Date(), primaryThemeKey: null, symbols: ["NVDA"], sectors: [], headline: "Test" });
  const prediction = await worldMemoryRepository.createPrediction({ worldMemoryRecordId: record.id, recommendationId: recommendation.id, predictedAction: "BUY", predictedConfidence: 80 });
  await worldMemoryRepository.createOutcome({
    recommendationId: recommendation.id,
    worldMemoryPredictionId: prediction.id,
    symbol: "NVDA",
    action: "BUY",
    timeWindow: "D1",
    windowStartPrice: 100,
    gradeLabel: "UNGRADEABLE",
    ungradeableReason: "No quote.",
    methodologyVersion: "test-v1",
    dataSourceSnapshot: {},
  });

  const dashboard = await qualityDashboardService.computeQualityDashboard();
  assert.equal(dashboard.hitRate, 67, "2 of 3 gradeable outcomes correct, UNGRADEABLE excluded from the denominator");
  assert.equal(dashboard.sampleSizes.gradedOutcomes, 3);
  assert.equal(dashboard.sampleSizes.totalOutcomes, 4);
  assert.equal(prisma !== null, true);
});

test("confidenceCalibration rewards high confidence on correct calls and penalizes high confidence on incorrect calls", async () => {
  await seedGradedOutcome({ predictedConfidence: 90, directionCorrect: true, gradeLabel: "CORRECT" });
  await seedGradedOutcome({ predictedConfidence: 90, directionCorrect: false, gradeLabel: "INCORRECT" });

  const dashboard = await qualityDashboardService.computeQualityDashboard();
  // (0.9 + (1 - 0.9)) / 2 = 0.5 -> 50
  assert.equal(dashboard.confidenceCalibration, 50);
});

test("avgHoldingPeriodHours reflects real elapsed time between recommendation creation and grading", async () => {
  const created = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const graded = new Date();
  await seedGradedOutcome({ createdAt: created, gradedAt: graded });

  const dashboard = await qualityDashboardService.computeQualityDashboard();
  assert.ok(dashboard.avgHoldingPeriodHours >= 23.9 && dashboard.avgHoldingPeriodHours <= 24.1, `expected ~24h, got ${dashboard.avgHoldingPeriodHours}`);
});

test("outcomeCompletion is the real fraction of predictions that have been graded (any grade, including UNGRADEABLE)", async () => {
  await seedGradedOutcome();

  const prisma = getPrismaClient();
  const recommendation = await autonomousRecommendationRepository.createRecommendation(recommendationData({ symbol: "AAPL" }));
  const record = await worldMemoryRepository.createRecord({ canonicalEventId: null, occurredAt: new Date(), primaryThemeKey: null, symbols: ["AAPL"], sectors: [], headline: "Test" });
  await worldMemoryRepository.createPrediction({ worldMemoryRecordId: record.id, recommendationId: recommendation.id, predictedAction: "BUY", predictedConfidence: 70 });
  // second prediction left ungraded on purpose

  const dashboard = await qualityDashboardService.computeQualityDashboard();
  assert.equal(dashboard.sampleSizes.totalPredictions, 2);
  assert.equal(dashboard.outcomeCompletion, 50);
});

test("avgUncertainty averages the real uncertainty already stored on each DecisionTrace", async () => {
  const recommendation = await autonomousRecommendationRepository.createRecommendation(recommendationData());
  await autonomousRecommendationRepository.createDecisionTrace({
    recommendationId: recommendation.id,
    inputEvidence: {},
    rankingResult: {},
    confidenceCalculation: { uncertainty: 40 },
    finalOutput: {},
  });

  const dashboard = await qualityDashboardService.computeQualityDashboard();
  assert.equal(dashboard.avgUncertainty, 40);
});
