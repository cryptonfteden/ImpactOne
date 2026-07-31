const test = require("node:test");
const assert = require("node:assert/strict");
const { requestLogger } = require("./requestLogger");

function fakeReqRes({ method = "GET", originalUrl = "/api/health", correlationId = null, betaUserId = null } = {}) {
  const listeners = {};
  const req = {
    method,
    originalUrl,
    get: (header) => (header === "X-Correlation-Id" ? correlationId : null),
    betaUserId,
  };
  const res = {
    statusCode: 200,
    on: (event, handler) => { listeners[event] = handler; },
    finish: () => listeners.finish(),
  };
  return { req, res };
}

test("logs one real, structured JSON line after the real response finishes, never before", () => {
  const originalLog = console.log;
  const logs = [];
  console.log = (line) => logs.push(line);
  try {
    const { req, res } = fakeReqRes({ method: "POST", originalUrl: "/api/v2/claims/active" });
    let nextCalled = false;
    requestLogger(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    assert.equal(logs.length, 0, "must not log before the real response finishes");

    res.statusCode = 201;
    res.finish();

    assert.equal(logs.length, 1);
    const parsed = JSON.parse(logs[0]);
    assert.equal(parsed.method, "POST");
    assert.equal(parsed.path, "/api/v2/claims/active");
    assert.equal(parsed.status, 201);
    assert.ok(Number.isFinite(parsed.durationMs));
    assert.ok(parsed.timestamp);
  } finally {
    console.log = originalLog;
  }
});

test("carries the real X-Correlation-Id and betaUserId through to the log line, honestly null when absent", () => {
  const originalLog = console.log;
  const logs = [];
  console.log = (line) => logs.push(line);
  try {
    const { req, res } = fakeReqRes({ correlationId: "corr_abc", betaUserId: "user_123" });
    requestLogger(req, res, () => {});
    res.finish();
    const parsed = JSON.parse(logs[0]);
    assert.equal(parsed.correlationId, "corr_abc");
    assert.equal(parsed.betaUserId, "user_123");
  } finally {
    console.log = originalLog;
  }
});

test("honestly logs null correlationId/betaUserId when neither is present on the real request", () => {
  const originalLog = console.log;
  const logs = [];
  console.log = (line) => logs.push(line);
  try {
    const { req, res } = fakeReqRes();
    requestLogger(req, res, () => {});
    res.finish();
    const parsed = JSON.parse(logs[0]);
    assert.equal(parsed.correlationId, null);
    assert.equal(parsed.betaUserId, null);
  } finally {
    console.log = originalLog;
  }
});
