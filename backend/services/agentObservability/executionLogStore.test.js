const test = require("node:test");
const assert = require("node:assert/strict");
const { createInMemoryExecutionLogStore } = require("./executionLogStore");

test("setMaxRecords shrinks the ceiling and evicts immediately, keeping every index consistent", () => {
  const store = createInMemoryExecutionLogStore({ maxRecords: 10 });
  for (let i = 0; i < 5; i += 1) {
    store.append({ executionId: `e${i}`, correlationId: `c${i}`, symbol: `S${i}` });
  }
  assert.equal(store.size(), 5);

  store.setMaxRecords(2);
  assert.equal(store.size(), 2);
  assert.equal(store.getByExecutionId("e0"), null);
  assert.equal(store.getByExecutionId("e1"), null);
  assert.equal(store.getByExecutionId("e2"), null);
  assert.ok(store.getByExecutionId("e3"));
  assert.ok(store.getByExecutionId("e4"));
  assert.deepEqual(store.getBySymbol("S0"), []);
});

test("setMaxRecords growing the ceiling never evicts anything and simply raises the bound", () => {
  const store = createInMemoryExecutionLogStore({ maxRecords: 2 });
  store.append({ executionId: "e0", symbol: "S" });
  store.append({ executionId: "e1", symbol: "S" });
  store.setMaxRecords(10);
  store.append({ executionId: "e2", symbol: "S" });
  assert.equal(store.size(), 3);
});

test("setMaxRecords rejects a non-positive or non-finite value", () => {
  const store = createInMemoryExecutionLogStore();
  assert.throws(() => store.setMaxRecords(0));
  assert.throws(() => store.setMaxRecords(-5));
  assert.throws(() => store.setMaxRecords(NaN));
});

test("getMaxRecords reflects the real, current bound", () => {
  const store = createInMemoryExecutionLogStore({ maxRecords: 7 });
  assert.equal(store.getMaxRecords(), 7);
  store.setMaxRecords(3);
  assert.equal(store.getMaxRecords(), 3);
});
