const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzePolicyDirection } = require("./policyDirectionAnalyzer");

function series(changeYoY, value = 3.63, dataAvailable = true) {
  return { dataAvailable, changeYoY, latest: { value } };
}

test("classifies TIGHTENING when the real Fed funds rate rises YoY beyond threshold", () => {
  assert.equal(analyzePolicyDirection(series(0.5)).direction, "TIGHTENING");
});

test("classifies EASING when the real Fed funds rate falls YoY beyond threshold", () => {
  assert.equal(analyzePolicyDirection(series(-16.17)).direction, "EASING");
});

test("classifies HOLDING within the threshold band", () => {
  assert.equal(analyzePolicyDirection(series(0.1)).direction, "HOLDING");
});

test("honestly reports UNKNOWN when real data is unavailable", () => {
  const result = analyzePolicyDirection(series(null, null, false));
  assert.equal(result.direction, "UNKNOWN");
  assert.equal(result.fedFundsRate, null);
});
