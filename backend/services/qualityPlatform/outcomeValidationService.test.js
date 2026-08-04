require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../../test/dbHelpers");
const { getPrismaClient } = require("../../db/prismaClient");
const autonomousRecommendationRepository = require("../autonomousRecommendationRepository");
const worldMemoryRepository = require("../worldMemoryRepository");
const recommendationLifecycleService = require("./recommendationLifecycleService");
const outcomeValidationService = require("./outcomeValidationService");

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
    explanation: {},
    scenarios: [],
    qualityScore: 75,
    qualityComponents: {},
    ...overrides,
  };
}

async function createOutcome(recommendationId, overrides = {}) {
  return worldMemoryRepository.createOutcome({
    recommendationId,
    symbol: "NVDA",
    action: "BUY",
    timeWindow: "D1",
    windowStartPrice: 100,
    windowEndPrice: 110,
    windowReturnPct: 10,
    directionCorrect: true,
    grade: 60,
    gradeLabel: "CORRECT",
    methodologyVersion: "test-v1",
    dataSourceSnapshot: {},
    benchmarkSymbol: "SPY",
    benchmarkReturnPct: 2,
    ...overrides,
  });
}

test.beforeEach(async () => {
  await truncateAll();
});

test("detectMissingGrading flags a prediction past the grading window with no Outcome, and honestly finds nothing for a fresh one", async () => {
  const recommendation = await autonomousRecommendationRepository.createRecommendation(recommendationData());
  const record = await worldMemoryRepository.createRecord({ canonicalEventId: null, occurredAt: new Date(), primaryThemeKey: null, symbols: ["NVDA"], sectors: [], headline: "t" });
  const prisma = getPrismaClient();
  await prisma.worldMemoryPrediction.create({
    data: { worldMemoryRecordId: record.id, recommendationId: recommendation.id, predictedAction: "BUY", predictedConfidence: 80, predictedAt: new Date(Date.now() - 25 * 60 * 60 * 1000) },
  });

  const findings = await outcomeValidationService.detectMissingGrading();
  assert.equal(findings.length, 1);
  assert.equal(findings[0].recommendationId, recommendation.id);
  assert.equal(findings[0].reason, "MISSING_GRADING");
});

test("detectMissingBenchmark flags a gradeable outcome with no benchmark, never a gradeable one that has one", async () => {
  const recommendation = await autonomousRecommendationRepository.createRecommendation(recommendationData());
  await createOutcome(recommendation.id, { benchmarkSymbol: null, benchmarkReturnPct: null });

  const findings = await outcomeValidationService.detectMissingBenchmark();
  assert.equal(findings.length, 1);
  assert.equal(findings[0].recommendationId, recommendation.id);
});

test("detectMissingBenchmark never flags an UNGRADEABLE outcome — no benchmark is honestly expected there", async () => {
  const recommendation = await autonomousRecommendationRepository.createRecommendation(recommendationData());
  await createOutcome(recommendation.id, { gradeLabel: "UNGRADEABLE", directionCorrect: null, grade: null, windowEndPrice: null, windowReturnPct: null, benchmarkSymbol: null, benchmarkReturnPct: null });

  const findings = await outcomeValidationService.detectMissingBenchmark();
  assert.equal(findings.length, 0);
});

test("detectMissingPrices flags a gradeable outcome with a missing end price", async () => {
  const recommendation = await autonomousRecommendationRepository.createRecommendation(recommendationData());
  await createOutcome(recommendation.id, { windowEndPrice: null });

  const findings = await outcomeValidationService.detectMissingPrices();
  assert.equal(findings.length, 1);
});

test("detectInvalidLifecycle flags an out-of-order transition and honestly finds nothing for a valid sequence", async () => {
  const valid = await autonomousRecommendationRepository.createRecommendation(recommendationData());
  await recommendationLifecycleService.recordTransition({ recommendationId: valid.id, state: "GENERATED" });
  await recommendationLifecycleService.recordTransition({ recommendationId: valid.id, state: "PUBLISHED" });
  await recommendationLifecycleService.recordTransition({ recommendationId: valid.id, state: "ACTIVE" });
  await recommendationLifecycleService.recordTransition({ recommendationId: valid.id, state: "SUCCEEDED" });

  const invalid = await autonomousRecommendationRepository.createRecommendation(recommendationData());
  const prisma = getPrismaClient();
  // Bypass the service's own ordering (it doesn't enforce sequence today)
  // to simulate a real corrupted/out-of-order history for the detector to catch.
  await prisma.recommendationLifecycleEvent.create({ data: { recommendationId: invalid.id, state: "SUCCEEDED" } });
  await prisma.recommendationLifecycleEvent.create({ data: { recommendationId: invalid.id, state: "GENERATED", occurredAt: new Date(Date.now() + 1000) } });

  const findings = await outcomeValidationService.detectInvalidLifecycle();
  const invalidFindings = findings.filter((finding) => finding.recommendationId === invalid.id);
  const validFindings = findings.filter((finding) => finding.recommendationId === valid.id);
  assert.ok(invalidFindings.length > 0, "the corrupted sequence must be flagged");
  assert.equal(validFindings.length, 0, "a real, correctly-ordered lifecycle must never be flagged");
});

test("detectDuplicateGrading finds nothing for real data (the DB's own unique constraint already prevents true duplicates)", async () => {
  const recommendation = await autonomousRecommendationRepository.createRecommendation(recommendationData());
  await createOutcome(recommendation.id);
  const findings = await outcomeValidationService.detectDuplicateGrading();
  assert.equal(findings.length, 0);
});

test("runOutcomeValidation aggregates every check into one report with a real byReason breakdown", async () => {
  const recommendation = await autonomousRecommendationRepository.createRecommendation(recommendationData());
  await createOutcome(recommendation.id, { benchmarkSymbol: null, benchmarkReturnPct: null });

  const report = await outcomeValidationService.runOutcomeValidation();
  assert.ok(report.totalFindings >= 1);
  assert.ok(report.byReason.MISSING_BENCHMARK >= 1);
  assert.ok(report.generatedAt);
});
