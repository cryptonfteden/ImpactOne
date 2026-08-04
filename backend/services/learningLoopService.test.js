require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const autonomousRecommendationRepository = require("./autonomousRecommendationRepository");
const learningLoopService = require("./learningLoopService");

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

test.beforeEach(async () => {
  await truncateAll();
});

test("computeLearningSignals aggregates real feedback by type and by symbol", async () => {
  const nvda = await autonomousRecommendationRepository.createRecommendation(recommendationData({ symbol: "NVDA" }));
  const aapl = await autonomousRecommendationRepository.createRecommendation(recommendationData({ symbol: "AAPL" }));

  await autonomousRecommendationRepository.createFeedback({ recommendationId: nvda.id, feedbackType: "USEFUL" });
  await autonomousRecommendationRepository.createFeedback({ recommendationId: nvda.id, feedbackType: "USEFUL" });
  await autonomousRecommendationRepository.createFeedback({ recommendationId: aapl.id, feedbackType: "NOT_USEFUL" });

  const signals = await learningLoopService.computeLearningSignals();
  assert.equal(signals.feedbackSignals.totalFeedback, 3);
  assert.equal(signals.feedbackSignals.byType.USEFUL, 2);
  assert.equal(signals.feedbackSignals.byType.NOT_USEFUL, 1);
  assert.deepEqual(signals.feedbackSignals.mostUsefulSymbols, ["NVDA"]);
  assert.deepEqual(signals.feedbackSignals.leastUsefulSymbols, ["AAPL"]);
});

test("computeLearningSignals is honest about zero feedback", async () => {
  const signals = await learningLoopService.computeLearningSignals();
  assert.equal(signals.feedbackSignals.totalFeedback, 0);
  assert.deepEqual(signals.feedbackSignals.mostUsefulSymbols, []);
  assert.deepEqual(signals.feedbackSignals.byType, {});
});

test("computeLearningSignals includes real outcome and theme signals, reusing existing services rather than recomputing", async () => {
  const signals = await learningLoopService.computeLearningSignals();
  assert.ok("hitRate" in signals.outcomeSignals);
  assert.ok("confidenceCalibration" in signals.outcomeSignals);
  assert.ok("outcomeCompletion" in signals.outcomeSignals);
  assert.ok(Array.isArray(signals.themeSignals.strengthenedThemes));
  assert.ok(Array.isArray(signals.themeSignals.weakenedThemes));
  assert.ok(Array.isArray(signals.themeSignals.disappearedThemes));
});

test("Learning Loop never appears as a dependency of the recommendation engine or the personal ranking engine (no immediate bias into today's recommendations)", () => {
  const engineSource = require("fs").readFileSync(require("path").join(__dirname, "autonomousRecommendationEngine.js"), "utf8");
  const rankingSource = require("fs").readFileSync(require("path").join(__dirname, "personalIntelligenceService.js"), "utf8");
  assert.equal(/learningLoopService/.test(engineSource), false, "the recommendation engine must never import the Learning Loop");
  assert.equal(/learningLoopService/.test(rankingSource), false, "the personal ranking engine must never import the Learning Loop");
});
