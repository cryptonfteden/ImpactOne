const test = require("node:test");
const assert = require("node:assert/strict");
const { createAgentExecutionLog } = require("./agentExecutionLog");
const { createInMemoryExecutionLogStore } = require("./executionLogStore");

test("createAgentExecutionLog accepts a caller-supplied store — 'configurable observability storage'", () => {
  const store = createInMemoryExecutionLogStore({ maxRecords: 3 });
  const log = createAgentExecutionLog({ store });

  log.append({ executionId: "e1", symbol: "NVDA" });
  assert.equal(store.size(), 1, "the log must write through to the exact store instance it was given");
  assert.deepEqual(log.getBySymbol("NVDA").map((r) => r.executionId), ["e1"]);
});

test("setMaxRecords/getMaxRecords on the log delegate to its backing store — 'configurable retention policies'", () => {
  const log = createAgentExecutionLog({ maxRecords: 100 });
  assert.equal(log.getMaxRecords(), 100);
  log.setMaxRecords(1);
  assert.equal(log.getMaxRecords(), 1);

  log.append({ executionId: "e1", symbol: "AAA" });
  log.append({ executionId: "e2", symbol: "BBB" });
  assert.equal(log.size(), 1, "shrinking retention must evict immediately, even mid-use");
});

test("a fresh createAgentExecutionLog() with no store builds its own isolated in-memory store by default", () => {
  const logA = createAgentExecutionLog();
  const logB = createAgentExecutionLog();
  logA.append({ executionId: "only-in-a", symbol: "AAA" });
  assert.equal(logB.size(), 0, "two independently-constructed logs must never share state");
});
