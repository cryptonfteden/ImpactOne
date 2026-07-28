const test = require("node:test");
const assert = require("node:assert/strict");
const { newCorrelationId, newExecutionId } = require("./correlationModel");

test("newCorrelationId and newExecutionId are unique and distinguishable by prefix", () => {
  const c1 = newCorrelationId();
  const c2 = newCorrelationId();
  const e1 = newExecutionId();
  assert.notEqual(c1, c2);
  assert.ok(c1.startsWith("corr_"));
  assert.ok(e1.startsWith("exec_"));
  assert.notEqual(c1, e1);
});
