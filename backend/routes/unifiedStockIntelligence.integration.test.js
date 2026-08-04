require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../app");
const { sharedRequestFailureLog } = require("../services/agentObservability/requestFailureLog");

test.beforeEach(() => {
  sharedRequestFailureLog.clear();
});

test("GET /api/v2/unified-stock-intelligence/:symbol returns the full unified report over real HTTP", async () => {
  const response = await request(app).get("/api/v2/unified-stock-intelligence/NVDA");
  assert.equal(response.status, 200);
  assert.equal(response.body.symbol, "NVDA");
  assert.ok(["BULLISH", "NEUTRAL", "BEARISH"].includes(response.body.overallIntelligence));
  assert.ok(Number.isFinite(response.body.overallConfidence));
  assert.ok(Array.isArray(response.body.keyDrivers));
  assert.equal(typeof response.body.aiExecutiveSummary, "string");
});

test("an inbound X-Correlation-Id is honored and echoed back, matching the report's own correlationId", async () => {
  const response = await request(app).get("/api/v2/unified-stock-intelligence/NVDA").set("X-Correlation-Id", "corr_unified_test");
  assert.equal(response.status, 200);
  assert.equal(response.headers["x-correlation-id"], "corr_unified_test");
  assert.equal(response.body.correlationId, "corr_unified_test");
});

test("a request-level failure (invalid/missing symbol) is logged with its correlation id, mirroring the other agent-platform endpoints", async () => {
  const response = await request(app).get("/api/v2/unified-stock-intelligence/%20").set("X-Correlation-Id", "corr_unified_bad_request");
  assert.equal(response.status, 400);
  const failures = sharedRequestFailureLog.getByCorrelationId("corr_unified_bad_request");
  assert.equal(failures.length, 1);
  assert.equal(failures[0].route, "GET /v2/unified-stock-intelligence/:symbol");
});
