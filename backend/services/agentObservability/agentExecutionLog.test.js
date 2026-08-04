const test = require("node:test");
const assert = require("node:assert/strict");
const { createAgentExecutionLog, DEFAULT_MAX_RECORDS } = require("./agentExecutionLog");

function makeRecord(overrides = {}) {
  return {
    executionId: `exec_${Math.random()}`,
    correlationId: "corr_1",
    agentId: "technical",
    symbol: "NVDA",
    startedAtMs: 1000,
    endedAtMs: 1100,
    ...overrides,
  };
}

test("append stores a record and it is retrievable by symbol/correlationId/executionId", () => {
  const log = createAgentExecutionLog();
  const record = makeRecord();
  log.append(record);

  assert.deepEqual(log.getBySymbol("NVDA"), [record]);
  assert.deepEqual(log.getByCorrelationId("corr_1"), [record]);
  assert.equal(log.getByExecutionId(record.executionId), record);
  assert.equal(log.size(), 1);
});

test("getBySymbol is case-insensitive on lookup (symbols are stored uppercase)", () => {
  const log = createAgentExecutionLog();
  log.append(makeRecord({ symbol: "NVDA" }));
  assert.equal(log.getBySymbol("nvda").length, 1);
});

test("append rejects a non-object record", () => {
  const log = createAgentExecutionLog();
  assert.throws(() => log.append(null), /requires a record object/);
  assert.throws(() => log.append("not an object"), /requires a record object/);
});

test("getBySymbol respects an optional limit, returning the most recent N", () => {
  const log = createAgentExecutionLog();
  for (let i = 0; i < 5; i += 1) {
    log.append(makeRecord({ executionId: `exec_${i}`, startedAtMs: i }));
  }
  const limited = log.getBySymbol("NVDA", { limit: 2 });
  assert.equal(limited.length, 2);
  assert.equal(limited[1].executionId, "exec_4");
});

test("the log is bounded — appending beyond maxRecords evicts the oldest and keeps every index consistent", () => {
  const log = createAgentExecutionLog({ maxRecords: 3 });
  for (let i = 0; i < 5; i += 1) {
    log.append(makeRecord({ executionId: `exec_${i}`, correlationId: `corr_${i}`, symbol: `SYM${i}` }));
  }
  assert.equal(log.size(), 3);
  // the oldest two (exec_0, exec_1) must be fully gone from every index
  assert.equal(log.getByExecutionId("exec_0"), null);
  assert.equal(log.getByExecutionId("exec_1"), null);
  assert.deepEqual(log.getBySymbol("SYM0"), []);
  assert.deepEqual(log.getByCorrelationId("corr_0"), []);
  // the newest three must still be present
  assert.ok(log.getByExecutionId("exec_4"));
  assert.ok(log.getByExecutionId("exec_3"));
  assert.ok(log.getByExecutionId("exec_2"));
});

test("clear() empties every index", () => {
  const log = createAgentExecutionLog();
  log.append(makeRecord());
  log.clear();
  assert.equal(log.size(), 0);
  assert.deepEqual(log.getBySymbol("NVDA"), []);
  assert.deepEqual(log.recent(), []);
});

test("recent() returns the most recently appended records, oldest first within the window", () => {
  const log = createAgentExecutionLog();
  for (let i = 0; i < 4; i += 1) log.append(makeRecord({ executionId: `exec_${i}` }));
  const last2 = log.recent({ limit: 2 });
  assert.deepEqual(last2.map((r) => r.executionId), ["exec_2", "exec_3"]);
});

test("DEFAULT_MAX_RECORDS is a real, finite bound (never unbounded growth by default)", () => {
  assert.ok(Number.isFinite(DEFAULT_MAX_RECORDS));
  assert.ok(DEFAULT_MAX_RECORDS > 0);
});
