require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../../test/dbHelpers");
const autonomousRecommendationRepository = require("../autonomousRecommendationRepository");
const recommendationLifecycleService = require("./recommendationLifecycleService");

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

test.beforeEach(async () => {
  await truncateAll();
});

test("recordTransition persists a real, timestamped state and getLifecycle reconstructs the ordered history", async () => {
  const recommendation = await autonomousRecommendationRepository.createRecommendation(recommendationData());
  await recommendationLifecycleService.recordTransition({ recommendationId: recommendation.id, state: "GENERATED" });
  await recommendationLifecycleService.recordTransition({ recommendationId: recommendation.id, state: "PUBLISHED" });
  await recommendationLifecycleService.recordTransition({ recommendationId: recommendation.id, state: "VIEWED" });

  const lifecycle = await recommendationLifecycleService.getLifecycle(recommendation.id);
  assert.deepEqual(lifecycle.events.map((event) => event.state), ["GENERATED", "PUBLISHED", "VIEWED"]);
  assert.ok(lifecycle.events.every((event) => event.occurredAt instanceof Date));
  assert.equal(lifecycle.currentState, "VIEWED");
});

test("recordTransition rejects an unknown state rather than silently storing an invented one", async () => {
  const recommendation = await autonomousRecommendationRepository.createRecommendation(recommendationData());
  await assert.rejects(() => recommendationLifecycleService.recordTransition({ recommendationId: recommendation.id, state: "PENDING_REVIEW" }));
});

test("GENERATED and PUBLISHED can each only happen once per recommendation — lifecycle integrity", async () => {
  const recommendation = await autonomousRecommendationRepository.createRecommendation(recommendationData());
  await recommendationLifecycleService.recordTransition({ recommendationId: recommendation.id, state: "GENERATED" });
  await assert.rejects(() => recommendationLifecycleService.recordTransition({ recommendationId: recommendation.id, state: "GENERATED" }));
});

test("VIEWED can be recorded multiple times — a user can genuinely view a recommendation more than once", async () => {
  const recommendation = await autonomousRecommendationRepository.createRecommendation(recommendationData());
  await recommendationLifecycleService.recordTransition({ recommendationId: recommendation.id, state: "VIEWED" });
  await recommendationLifecycleService.recordTransition({ recommendationId: recommendation.id, state: "VIEWED" });
  const lifecycle = await recommendationLifecycleService.getLifecycle(recommendation.id);
  assert.equal(lifecycle.events.length, 2);
});

test("recordTransitionSafely never throws, even for an invalid state — lifecycle logging must never block a caller", async () => {
  const result = await recommendationLifecycleService.recordTransitionSafely({ recommendationId: "does-not-exist", state: "NOT_A_REAL_STATE" });
  assert.equal(result, null);
});

test("getLifecycle for a recommendation with no events honestly reports an empty history, never a fabricated GENERATED event", async () => {
  const recommendation = await autonomousRecommendationRepository.createRecommendation(recommendationData());
  const lifecycle = await recommendationLifecycleService.getLifecycle(recommendation.id);
  assert.deepEqual(lifecycle.events, []);
  assert.equal(lifecycle.currentState, null);
});
