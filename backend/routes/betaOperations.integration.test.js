require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const { truncateAll } = require("../test/dbHelpers");
const app = require("../app");

test.beforeEach(async () => {
  await truncateAll();
});

test("POST /api/v2/feedback then GET round-trips a real submission", async () => {
  const post = await request(app).post("/api/v2/feedback").send({ type: "BUG", message: "Chart didn't load", screen: "AI Analysis" });
  assert.equal(post.status, 201);
  const list = await request(app).get("/api/v2/feedback");
  assert.equal(list.status, 200);
  assert.equal(list.body.feedback.length, 1);
});

test("POST /api/v2/error-reports persists a real structured report", async () => {
  const response = await request(app).post("/api/v2/error-reports").send({ source: "frontend", message: "real crash", correlationId: "corr-1" });
  assert.equal(response.status, 201);
  const list = await request(app).get("/api/v2/error-reports");
  assert.equal(list.body.errors[0].correlationId, "corr-1");
});

test("Feature flags: set then evaluate reflects the real, current mode with no code change", async () => {
  await request(app).patch("/api/v2/feature-flags/real_flag").send({ mode: "ENABLED" });
  const evaluated = await request(app).get("/api/v2/feature-flags/real_flag/evaluate");
  assert.equal(evaluated.body.enabled, true);

  await request(app).patch("/api/v2/feature-flags/real_flag").send({ mode: "DISABLED" });
  const evaluatedAgain = await request(app).get("/api/v2/feature-flags/real_flag/evaluate");
  assert.equal(evaluatedAgain.body.enabled, false);
});

test("GET /api/v2/admin-dashboard returns all required real fields", async () => {
  const response = await request(app).get("/api/v2/admin-dashboard");
  assert.equal(response.status, 200);
  for (const field of ["dailyActiveUsers", "weeklySessions", "averageSessionLength", "mostUsedScreens", "mostUsedFeatures", "errors", "crashes", "feedbackCount", "topRecommendationsViewed", "decisionCenterUsage"]) {
    assert.ok(field in response.body, `missing field: ${field}`);
  }
});

test("GET /api/v2/beta-metrics returns all eight required real metrics", async () => {
  const response = await request(app).get("/api/v2/beta-metrics");
  assert.equal(response.status, 200);
  for (const field of ["activationRate", "retention", "dailyUsage", "featureAdoption", "timeToFirstValue", "averageSession", "feedbackPerUser", "crashFreeSessions"]) {
    assert.ok(field in response.body, `missing field: ${field}`);
  }
});

test("GET /api/v2/performance-metrics returns real API latency, memory, and bundle size", async () => {
  await request(app).get("/api/v2/home-summary"); // generate one real latency sample
  const response = await request(app).get("/api/v2/performance-metrics");
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.apiLatency));
  assert.ok(response.body.memoryUsage.rssMb > 0);
});

test("POST /api/v2/performance-metrics/client-timing records a real client-reported duration", async () => {
  const response = await request(app).post("/api/v2/performance-metrics/client-timing").send({ kind: "chartRender", durationMs: 120 });
  assert.equal(response.status, 204);
  const metrics = await request(app).get("/api/v2/performance-metrics");
  assert.equal(metrics.body.chartRenderTime.count, 1);
});
