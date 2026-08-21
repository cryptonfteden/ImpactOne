const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzePolicyDirection } = require("./policyDirectionAnalyzer");

function series(changeYoYPercentagePoints, value = 3.63, dataAvailable = true) {
  return { dataAvailable, changeYoYPercentagePoints, latest: { value } };
}

test("classifies TIGHTENING when the real Fed funds rate rises YoY beyond threshold", () => {
  assert.equal(analyzePolicyDirection(series(0.5)).direction, "TIGHTENING");
});

test("classifies EASING when the real Fed funds rate falls YoY beyond threshold", () => {
  const result = analyzePolicyDirection(series(-0.7));
  assert.equal(result.direction, "EASING");
  assert.equal(result.fedFundsChangeYoY, -0.7);
});

test("classifies HOLDING within the threshold band", () => {
  assert.equal(analyzePolicyDirection(series(0.1)).direction, "HOLDING");
});

test("honestly reports UNKNOWN when real data is unavailable", () => {
  const result = analyzePolicyDirection(series(null, null, false));
  assert.equal(result.direction, "UNKNOWN");
  assert.equal(result.fedFundsRate, null);
});
