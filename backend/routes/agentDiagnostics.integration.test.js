require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../app");
const { sharedScheduler } = require("../services/agentScheduler/agentScheduler");

test("GET /api/v2/agent-diagnostics returns a consolidated, real snapshot of scheduler + observability state", async () => {
  const response = await request(app).get("/api/v2/agent-diagnostics");
  assert.equal(response.status, 200);

  assert.ok(response.body.generatedAt);
  assert.ok(Number.isFinite(response.body.process.uptimeSeconds));
  assert.ok(response.body.process.nodeVersion);
  assert.ok(Number.isFinite(response.body.process.memory.rssBytes));

  assert.ok(response.body.scheduler.config);
  assert.ok(Number.isFinite(response.body.scheduler.config.concurrency));
  assert.ok(response.body.scheduler.metrics);
  assert.ok(response.body.scheduler.healthCache);
  assert.ok(Number.isFinite(response.body.scheduler.healthCache.hits));

  assert.ok(Number.isFinite(response.body.observability.executionLog.size));
  assert.ok(Number.isFinite(response.body.observability.executionLog.maxRecords));
  assert.ok(Array.isArray(response.body.observability.requestFailureLog.recent));
});

test("the diagnostics snapshot reflects a real, live scheduler config change", async () => {
  const before = await request(app).get("/api/v2/agent-diagnostics");
  const originalConcurrency = before.body.scheduler.config.concurrency;

  sharedScheduler.updateConfig({ concurrency: originalConcurrency + 5 });
  const after = await request(app).get("/api/v2/agent-diagnostics");
  assert.equal(after.body.scheduler.config.concurrency, originalConcurrency + 5);

  sharedScheduler.updateConfig({ concurrency: originalConcurrency }); // restore, this is the shared process-wide instance
});
