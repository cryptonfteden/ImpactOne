require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const { getPrismaClient } = require("../db/prismaClient");
const outcomeFeedbackService = require("./outcomeFeedbackService");
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

async function createGradedOutcome({ action = "BUY", directionCorrect }) {
  const prisma = getPrismaClient();
  const recommendation = await autonomousRecommendationRepository.createRecommendation(recommendationData({ action }));
  return prisma.outcome.create({
    data: {
      recommendationId: recommendation.id,
      symbol: "NVDA",
      action,
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

test("withholds an adjustment below the minimum sample threshold, with a real reason, and still audits it", async () => {
  for (let i = 0; i < 5; i++) {
    await createGradedOutcome({ directionCorrect: true });
  }
  const results = await outcomeFeedbackService.computeAndAuditActionAdjustments();
  assert.equal(results.BUY.applied, false);
  assert.equal(results.BUY.adjustmentValue, 0);
  assert.ok(results.BUY.reason.includes("Only 5"));

  const audits = await outcomeFeedbackService.getAuditHistory({ adjustmentKey: "BUY" });
  assert.equal(audits.length, 1);
  assert.equal(audits[0].applied, false);
});

test("applies a real, bounded adjustment once the sample is statistically meaningful", async () => {
  for (let i = 0; i < 18; i++) {
    await createGradedOutcome({ directionCorrect: true });
  }
  const results = await outcomeFeedbackService.computeAndAuditActionAdjustments();
  assert.equal(results.BUY.applied, true);
  assert.equal(results.BUY.sampleSize, 18);
  assert.ok(results.BUY.adjustmentValue > 0);
  assert.ok(results.BUY.adjustmentValue <= 8);
});

test("adjustments are isolated per action", async () => {
  for (let i = 0; i < 18; i++) {
    await createGradedOutcome({ action: "BUY", directionCorrect: true });
  }
  for (let i = 0; i < 18; i++) {
    await createGradedOutcome({ action: "EXIT", directionCorrect: false });
  }
  const results = await outcomeFeedbackService.computeAndAuditActionAdjustments();
  assert.ok(results.BUY.adjustmentValue > 0);
  assert.ok(results.EXIT.adjustmentValue < 0);
});

test("every computation is persisted to the audit table, whether applied or withheld", async () => {
  for (let i = 0; i < 20; i++) {
    await createGradedOutcome({ directionCorrect: i % 2 === 0 });
  }
  await outcomeFeedbackService.computeAndAuditActionAdjustments();
  await outcomeFeedbackService.computeAndAuditActionAdjustments();
  const audits = await outcomeFeedbackService.getAuditHistory({ adjustmentKey: "BUY" });
  assert.equal(audits.length, 2);
});
