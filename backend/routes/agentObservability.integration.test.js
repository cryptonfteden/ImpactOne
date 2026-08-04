require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../app");
const { sharedLog } = require("../services/agentObservability/agentExecutionLog");
const { sharedRequestFailureLog } = require("../services/agentObservability/requestFailureLog");

test.beforeEach(() => {
  sharedLog.clear();
  sharedRequestFailureLog.clear();
});

test("GET /api/v2/agent-observability/:symbol requires a symbol", async () => {
  const response = await request(app).get("/api/v2/agent-observability/%20");
  assert.equal(response.status, 400);
});

test("a real GET to /api/v2/agent-orchestrator/:symbol populates the observability log, then the trace endpoint returns it", async () => {
  const orchestratorResponse = await request(app).get("/api/v2/agent-orchestrator/NVDA");
  assert.equal(orchestratorResponse.status, 200);
  assert.equal(orchestratorResponse.body.symbol, "NVDA");

  const traceResponse = await request(app).get("/api/v2/agent-observability/NVDA");
  assert.equal(traceResponse.status, 200);
  assert.equal(traceResponse.body.symbol, "NVDA");
  assert.ok(traceResponse.body.recordCount > 0, "at least one agent execution must have been recorded");
  assert.ok(Array.isArray(traceResponse.body.timeline.events));
  assert.equal(traceResponse.body.timeline.events.length, traceResponse.body.recordCount);
  assert.ok(traceResponse.body.metrics.overall);
  assert.ok(Array.isArray(traceResponse.body.metrics.perAgent));
});

test("the trace endpoint returns an honest empty result for a symbol that was never queried", async () => {
  const response = await request(app).get("/api/v2/agent-observability/ZZZZ_NEVER_QUERIED");
  assert.equal(response.status, 200);
  assert.equal(response.body.recordCount, 0);
  assert.deepEqual(response.body.timeline.events, []);
});

test("PLATFORM-HARDENING-001: an inbound X-Correlation-Id is honored and echoed back verbatim, and the execution log is filed under it", async () => {
  const response = await request(app).get("/api/v2/agent-orchestrator/NVDA").set("X-Correlation-Id", "corr_from_test_client");
  assert.equal(response.status, 200);
  assert.equal(response.headers["x-correlation-id"], "corr_from_test_client");

  const filteredTrace = await request(app).get("/api/v2/agent-observability/NVDA").query({ correlationId: "corr_from_test_client" });
  assert.ok(filteredTrace.body.recordCount > 0);
});

test("PLATFORM-HARDENING-001: with no inbound correlation id, one is generated and echoed back on every response", async () => {
  const response = await request(app).get("/api/v2/agent-orchestrator/NVDA");
  assert.match(response.headers["x-correlation-id"], /^corr_/);

  const traceResponse = await request(app).get("/api/v2/agent-observability/NVDA");
  assert.match(traceResponse.headers["x-correlation-id"], /^corr_/);
});

test("PLATFORM-HARDENING-001: a request-level failure (missing symbol) is logged with its correlation id", async () => {
  const response = await request(app).get("/api/v2/agent-observability/%20").set("X-Correlation-Id", "corr_bad_request");
  assert.equal(response.status, 400);

  const failures = sharedRequestFailureLog.getByCorrelationId("corr_bad_request");
  assert.equal(failures.length, 1);
  assert.equal(failures[0].statusCode, 400);
  assert.equal(failures[0].route, "GET /v2/agent-observability/:symbol");
});
