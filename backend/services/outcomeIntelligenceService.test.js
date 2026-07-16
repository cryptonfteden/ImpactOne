require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const { getPrismaClient } = require("../db/prismaClient");
const autonomousRecommendationRepository = require("./autonomousRecommendationRepository");
const worldMemoryRepository = require("./worldMemoryRepository");
const outcomeIntelligenceService = require("./outcomeIntelligenceService");

function recommendationData(overrides = {}) {
  return {
    symbol: "NVDA",
    action: "BUY",
    confidenceScore: 82,
    expectedUpside: "10-15%",
    expectedDownside: "-6%",
    riskScore: 30,
    riskLabel: "Low",
    positionSizeSuggestion: "2-4%",
    reasoning: "AI capex tailwind.",
    evidence: {},
    portfolioContext: null,
    timeHorizon: "1-3 months",
    explanation: { thesis: "Test thesis.", supportingEvidence: [], opposingEvidence: [], keyRisks: [], invalidationConditions: [], timeHorizon: "1-3 months", affectedPositions: [], affectedWatchlistSymbols: [], confidenceDrivers: [], confidenceReducers: [] },
    scenarios: [],
    qualityScore: 75,
    qualityComponents: {},
    ...overrides,
  };
}

async function seedOutcome({ recommendationOverrides = {}, directionCorrect, gradeLabel, windowReturnPct = null, ungradeableReason = null }) {
  const recommendation = await autonomousRecommendationRepository.createRecommendation(recommendationData(recommendationOverrides));
  const prisma = getPrismaClient();
  const outcome = await prisma.outcome.create({
    data: {
      recommendationId: recommendation.id,
      symbol: recommendation.symbol,
      action: recommendation.action,
      timeWindow: "D1",
      windowStartPrice: 100,
      windowReturnPct,
      directionCorrect,
      gradeLabel,
      ungradeableReason,
      methodologyVersion: "test-v1",
      dataSourceSnapshot: {},
    },
  });
  return { recommendation, outcome };
}

test.beforeEach(async () => {
  await truncateAll();
});

test("generateLessonsFromOutcomes writes one lesson per graded outcome, explaining what was correct", async () => {
  await seedOutcome({ directionCorrect: true, gradeLabel: "CORRECT", windowReturnPct: 8.3 });

  const result = await outcomeIntelligenceService.generateLessonsFromOutcomes();
  assert.equal(result.generated, 1);
  assert.match(result.lessons[0].lessonText, /What was correct/);
  assert.match(result.lessons[0].lessonText, /NVDA/);
  assert.match(result.lessons[0].lessonText, /\+8\.30%/);
});

test("generateLessonsFromOutcomes explains what was wrong and what changed for an incorrect call", async () => {
  await seedOutcome({ directionCorrect: false, gradeLabel: "INCORRECT", windowReturnPct: -5.1, recommendationOverrides: { symbol: "MSFT" } });

  const result = await outcomeIntelligenceService.generateLessonsFromOutcomes();
  assert.equal(result.generated, 1);
  assert.match(result.lessons[0].lessonText, /What was wrong/);
  assert.match(result.lessons[0].lessonText, /What changed/);
  assert.match(result.lessons[0].lessonText, /MSFT/);
});

test("generateLessonsFromOutcomes is honest about UNGRADEABLE outcomes rather than fabricating a correct/incorrect verdict", async () => {
  await seedOutcome({ directionCorrect: null, gradeLabel: "UNGRADEABLE", ungradeableReason: "No live quote available." });

  const result = await outcomeIntelligenceService.generateLessonsFromOutcomes();
  assert.equal(result.generated, 1);
  assert.match(result.lessons[0].lessonText, /could not be graded/);
  assert.doesNotMatch(result.lessons[0].lessonText, /What was correct|What was wrong/);
});

test("generateLessonsFromOutcomes never generates a second lesson for the same outcome", async () => {
  await seedOutcome({ directionCorrect: true, gradeLabel: "CORRECT", windowReturnPct: 3 });

  const first = await outcomeIntelligenceService.generateLessonsFromOutcomes();
  assert.equal(first.generated, 1);

  const second = await outcomeIntelligenceService.generateLessonsFromOutcomes();
  assert.equal(second.generated, 0, "an outcome that already has a lesson must never get a duplicate");
});

test("listRecentLessons reads real persisted lessons back, most recent first", async () => {
  await seedOutcome({ directionCorrect: true, gradeLabel: "CORRECT", windowReturnPct: 3 });
  await outcomeIntelligenceService.generateLessonsFromOutcomes();

  const lessons = await outcomeIntelligenceService.listRecentLessons();
  assert.equal(lessons.length, 1);
  assert.match(lessons[0].lessonText, /NVDA/);
});

test("the repository exposes no update method for lessons (never rewrite history)", () => {
  const exportedNames = Object.keys(worldMemoryRepository);
  assert.equal(exportedNames.some((name) => /updateLesson/i.test(name)), false);
});
