require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const { truncateAll } = require("../test/dbHelpers");
const app = require("../app");
const autonomousRecommendationRepository = require("../services/autonomousRecommendationRepository");
const recommendationLifecycleService = require("../services/qualityPlatform/recommendationLifecycleService");

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
    explanation: { thesis: "t", supportingEvidence: [], opposingEvidence: [], keyRisks: [], invalidationConditions: [], timeHorizon: "1-3 months", affectedPositions: [], affectedWatchlistSymbols: [], confidenceDrivers: [], confidenceReducers: [] },
    scenarios: [],
    qualityScore: 75,
    qualityComponents: {},
    ...overrides,
  };
}

test.beforeEach(async () => {
  await truncateAll();
});

test("GET /api/v2/quality-platform/recommendations/:id/lifecycle returns the real, ordered lifecycle for a recommendation", async () => {
  const recommendation = await autonomousRecommendationRepository.createRecommendation(recommendationData());
  await recommendationLifecycleService.recordTransition({ recommendationId: recommendation.id, state: "GENERATED" });
  await recommendationLifecycleService.recordTransition({ recommendationId: recommendation.id, state: "PUBLISHED" });

  const response = await request(app).get(`/api/v2/quality-platform/recommendations/${recommendation.id}/lifecycle`);
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.events.map((event) => event.state), ["GENERATED", "PUBLISHED"]);
  assert.equal(response.body.currentState, "PUBLISHED");
});

test("GET /api/v2/quality-platform/recommendations/:id/lifecycle for an unknown id honestly returns an empty history, not an error", async () => {
  const response = await request(app).get("/api/v2/quality-platform/recommendations/does-not-exist/lifecycle");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.events, []);
});

test("GET /api/v2/quality-platform/committee-scorecard returns an honest empty scorecard before any outcomes are graded", async () => {
  const response = await request(app).get("/api/v2/quality-platform/committee-scorecard");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.members, []);
});

test("GET /api/v2/quality-platform/committee-scorecard/rollup returns all three mission-named rolling windows", async () => {
  const response = await request(app).get("/api/v2/quality-platform/committee-scorecard/rollup");
  assert.equal(response.status, 200);
  assert.ok(response.body[30]);
  assert.ok(response.body[90]);
  assert.ok(response.body[365]);
});

test("GET /api/v2/quality-platform/cio-scorecard returns an honest zero-sample scorecard before any outcomes are graded", async () => {
  const response = await request(app).get("/api/v2/quality-platform/cio-scorecard");
  assert.equal(response.status, 200);
  assert.equal(response.body.sampleSize, 0);
  assert.equal(response.body.overallAccuracy, null);
  assert.equal(response.body.holdAccuracy, null);
});

test("GET /api/v2/quality-platform/evidence-scorecard returns an honest empty category list before any outcomes are graded", async () => {
  const response = await request(app).get("/api/v2/quality-platform/evidence-scorecard");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.categories, []);
  assert.equal(response.body.totalGradedRecommendations, 0);
});

test("scorecard routes accept a real windowDays query param", async () => {
  const response = await request(app).get("/api/v2/quality-platform/cio-scorecard?windowDays=30");
  assert.equal(response.status, 200);
  assert.equal(response.body.windowDays, 30);
});
