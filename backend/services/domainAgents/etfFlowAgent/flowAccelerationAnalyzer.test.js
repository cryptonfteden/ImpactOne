const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeFlowAcceleration } = require("./flowAccelerationAnalyzer");

function flow(priceChangePercent) {
  return { priceChangePercent };
}

test("analyzeFlowAcceleration honestly reports UNKNOWN when either real window is missing", () => {
  assert.deepEqual(analyzeFlowAcceleration({ weekly: null, monthly: flow(5) }), { classification: "UNKNOWN", accelerationRate: null });
  assert.deepEqual(analyzeFlowAcceleration({ weekly: flow(5), monthly: null }), { classification: "UNKNOWN", accelerationRate: null });
});

test("analyzeFlowAcceleration: a real weekly pace much faster than the monthly baseline pace is ACCELERATING", () => {
  const result = analyzeFlowAcceleration({ weekly: flow(10), monthly: flow(2) }); // weekly daily rate 2.0, monthly daily rate ~0.095
  assert.equal(result.classification, "ACCELERATING");
  assert.ok(result.accelerationRate > 0);
});

test("analyzeFlowAcceleration: a real weekly pace much slower than the monthly baseline pace is DECELERATING", () => {
  const result = analyzeFlowAcceleration({ weekly: flow(0), monthly: flow(21) }); // monthly daily rate = 1.0, weekly daily rate = 0
  assert.equal(result.classification, "DECELERATING");
  assert.ok(result.accelerationRate < 0);
});

test("analyzeFlowAcceleration: real weekly and monthly paces that are roughly consistent report STABLE", () => {
  const result = analyzeFlowAcceleration({ weekly: flow(1), monthly: flow(4.2) }); // weekly daily rate 0.2, monthly daily rate 0.2
  assert.equal(result.classification, "STABLE");
});
