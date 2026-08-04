const test = require("node:test");
const assert = require("node:assert/strict");
const { createRequestFailureLog } = require("./requestFailureLog");

test("append stores a real entry with an added timestamp, retrievable by correlationId", () => {
  const log = createRequestFailureLog();
  log.append({ correlationId: "corr_1", route: "GET /v2/agent-orchestrator/:symbol", symbol: "NVDA", statusCode: 400, message: "A stock symbol is required." });

  const matches = log.getByCorrelationId("corr_1");
  assert.equal(matches.length, 1);
  assert.equal(matches[0].statusCode, 400);
  assert.equal(matches[0].message, "A stock symbol is required.");
  assert.ok(matches[0].timestamp, "every entry must carry a real timestamp");
});

test("append rejects a non-object entry", () => {
  const log = createRequestFailureLog();
  assert.throws(() => log.append(null), /requires an entry object/);
});

test("the log is bounded by maxRecords, evicting oldest-first", () => {
  const log = createRequestFailureLog({ maxRecords: 2 });
  log.append({ correlationId: "c1", route: "r", message: "m1" });
  log.append({ correlationId: "c2", route: "r", message: "m2" });
  log.append({ correlationId: "c3", route: "r", message: "m3" });
  assert.equal(log.size(), 2);
  assert.deepEqual(log.getByCorrelationId("c1"), []);
});

test("setMaxRecords/getMaxRecords make retention configurable at runtime", () => {
  const log = createRequestFailureLog({ maxRecords: 10 });
  log.append({ correlationId: "c1", route: "r", message: "m1" });
  log.append({ correlationId: "c2", route: "r", message: "m2" });
  log.setMaxRecords(1);
  assert.equal(log.getMaxRecords(), 1);
  assert.equal(log.size(), 1);
});

test("recent() returns the most recently appended entries", () => {
  const log = createRequestFailureLog();
  for (let i = 0; i < 3; i += 1) log.append({ correlationId: `c${i}`, route: "r", message: `m${i}` });
  const last2 = log.recent({ limit: 2 });
  assert.deepEqual(last2.map((r) => r.correlationId), ["c1", "c2"]);
});

test("clear() empties the log", () => {
  const log = createRequestFailureLog();
  log.append({ correlationId: "c1", route: "r", message: "m1" });
  log.clear();
  assert.equal(log.size(), 0);
});
