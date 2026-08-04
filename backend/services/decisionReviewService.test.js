require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const { getPrismaClient } = require("../db/prismaClient");
const autonomousRecommendationRepository = require("./autonomousRecommendationRepository");
const worldMemoryRepository = require("./worldMemoryRepository");
const decisionReviewService = require("./decisionReviewService");

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
    reasoning: "AI capex tailwind.",
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

test.beforeEach(async () => {
  await truncateAll();
});

test("getDecisionReview throws a 404-style error for an unknown recommendation", async () => {
  await assert.rejects(() => decisionReviewService.getDecisionReview("not-a-real-id"), (error) => error.statusCode === 404);
});

test("getDecisionReview returns the real recommendation, evidence, and explanation, honestly null for outcome/lesson/calibration when none exist yet", async () => {
  const rec = await autonomousRecommendationRepository.createRecommendation(recommendationData());

  const review = await decisionReviewService.getDecisionReview(rec.id);
  assert.equal(review.recommendation.symbol, "NVDA");
  assert.equal(review.recommendation.action, "BUY");
  assert.deepEqual(review.evidence, { currentPrice: 100 });
  assert.equal(review.explanation.thesis, "Test thesis.");
  assert.equal(review.outcome, null);
  assert.equal(review.lesson, null);
  assert.equal(review.decisionTrace, null);
});

test("getDecisionReview's timeline includes real history for the same symbol, oldest first, marking the current recommendation", async () => {
  const first = await autonomousRecommendationRepository.createRecommendation(recommendationData({ confidenceScore: 70 }));
  await autonomousRecommendationRepository.supersedeActiveForSymbol("NVDA", first.id);
  const second = await autonomousRecommendationRepository.createRecommendation(recommendationData({ confidenceScore: 85 }));
  await autonomousRecommendationRepository.supersedeActiveForSymbol("NVDA", second.id);

  const review = await decisionReviewService.getDecisionReview(second.id);
  assert.equal(review.timeline.length, 2);
  assert.equal(review.timeline[0].id, first.id);
  assert.equal(review.timeline[1].id, second.id);
  assert.equal(review.timeline[1].isCurrent, true);
  assert.equal(review.timeline[0].isCurrent, false);
});

test("getDecisionReview surfaces the real Outcome and Lesson once they exist", async () => {
  const rec = await autonomousRecommendationRepository.createRecommendation(recommendationData());
  const prisma = getPrismaClient();
  const outcome = await prisma.outcome.create({
    data: {
      recommendationId: rec.id,
      symbol: "NVDA",
      action: "BUY",
      timeWindow: "D1",
      windowStartPrice: 100,
      windowEndPrice: 108,
      windowReturnPct: 8,
      directionCorrect: true,
      gradeLabel: "CORRECT",
      methodologyVersion: "test-v1",
      dataSourceSnapshot: {},
    },
  });
  await worldMemoryRepository.appendLesson({ outcomeId: outcome.id, lessonText: "Test lesson.", methodologyVersion: "test-v1" });

  const review = await decisionReviewService.getDecisionReview(rec.id);
  assert.ok(review.outcome);
  assert.equal(review.outcome.directionCorrect, true);
  assert.ok(review.lesson);
  assert.equal(review.lesson.lessonText, "Test lesson.");
});

test("getDecisionReview surfaces the real feedback recorded for this recommendation", async () => {
  const rec = await autonomousRecommendationRepository.createRecommendation(recommendationData());
  await autonomousRecommendationRepository.createFeedback({ recommendationId: rec.id, feedbackType: "USEFUL" });

  const review = await decisionReviewService.getDecisionReview(rec.id);
  assert.equal(review.feedback.length, 1);
  assert.equal(review.feedback[0].feedbackType, "USEFUL");
});
