require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const { truncateAll } = require("../test/dbHelpers");
const app = require("../app");

test.beforeEach(async () => {
  await truncateAll();
});

test("GET /api/v2/providers lists all 15 registered providers with honest empty health", async () => {
  const response = await request(app).get("/api/v2/providers");
  assert.equal(response.status, 200);
  assert.equal(response.body.providers.length, 15);
  const sec = response.body.providers.find((entry) => entry.providerId === "sec");
  assert.equal(sec.lastRunAt, null);
});

test("GET /api/v2/providers/:providerId/health 404s for an unknown provider", async () => {
  const response = await request(app).get("/api/v2/providers/does-not-exist/health");
  assert.equal(response.status, 404);
});

test("GET /api/v2/providers/:providerId/health returns recentRuns for a known provider", async () => {
  await request(app).post("/api/v2/providers/reddit/run");
  const response = await request(app).get("/api/v2/providers/reddit/health");
  assert.equal(response.status, 200);
  assert.equal(response.body.providerId, "reddit");
  assert.ok(Array.isArray(response.body.recentRuns));
});

test("GET /api/v2/providers/:providerId/metrics 404s for an unknown provider", async () => {
  const response = await request(app).get("/api/v2/providers/does-not-exist/metrics");
  assert.equal(response.status, 404);
});

test("GET /api/v2/providers/:providerId/metrics returns an honest zero-state before any run", async () => {
  const response = await request(app).get("/api/v2/providers/sec/metrics");
  assert.equal(response.status, 200);
  assert.equal(response.body.totalRuns, 0);
  assert.equal(response.body.dedupRate, null);
});

test("GET /api/v2/providers/:providerId/metrics reflects a real run", async () => {
  await request(app).post("/api/v2/providers/nasa/run");
  const response = await request(app).get("/api/v2/providers/nasa/metrics");
  assert.equal(response.status, 200);
  assert.equal(response.body.totalRuns, 1);
  assert.equal(response.body.errorRate, 0);
});

test("GET /api/v2/providers/:providerId/diagnostics 404s for an unknown provider", async () => {
  const response = await request(app).get("/api/v2/providers/does-not-exist/diagnostics");
  assert.equal(response.status, 404);
});

test("GET /api/v2/providers/:providerId/diagnostics reports contract validity and rate-limiter state", async () => {
  const response = await request(app).get("/api/v2/providers/congress/diagnostics");
  assert.equal(response.status, 200);
  assert.equal(response.body.contractValid, true);
  assert.ok(Number.isFinite(response.body.rateLimiter.maxPerMinute));
  assert.equal(response.body.lastError, null);
});

test("GET /api/v2/providers/:providerId/metadata 404s for an unknown provider", async () => {
  const response = await request(app).get("/api/v2/providers/does-not-exist/metadata");
  assert.equal(response.status, 404);
});

test("GET /api/v2/providers/:providerId/metadata returns the static registry entry", async () => {
  const response = await request(app).get("/api/v2/providers/polymarket/metadata");
  assert.equal(response.status, 200);
  assert.equal(response.body.providerId, "polymarket");
  assert.equal(response.body.sourceType, "prediction-market");
  assert.ok(Array.isArray(response.body.defaultThemes));
  assert.ok(Number.isFinite(response.body.rateLimit.maxPerMinute));
});

test("POST /api/v2/providers/:providerId/run triggers a clean run for a stub provider", async () => {
  const response = await request(app).post("/api/v2/providers/fda/run");
  assert.equal(response.status, 200);
  assert.equal(response.body.status, "SUCCESS");
  assert.equal(response.body.itemsFetched, 0);
});

test("POST /api/v2/providers/:providerId/run 404s for an unknown provider", async () => {
  const response = await request(app).post("/api/v2/providers/does-not-exist/run");
  assert.equal(response.status, 404);
});
