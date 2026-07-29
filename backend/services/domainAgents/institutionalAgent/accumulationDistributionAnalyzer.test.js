const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeAccumulationDistribution } = require("./accumulationDistributionAnalyzer");

function position({ checked = true, currentValue, priorValue }) {
  return { checked, currentQuarter: currentValue === undefined ? null : { value: currentValue }, priorQuarter: priorValue === undefined ? null : { value: priorValue } };
}

test("analyzeAccumulationDistribution honestly reports 0/0 with no real comparable activity", () => {
  const result = analyzeAccumulationDistribution([position({ checked: false, currentValue: 100, priorValue: 50 })]);
  assert.equal(result.accumulationScore, 0);
  assert.equal(result.distributionScore, 0);
});

test("analyzeAccumulationDistribution: real, pure increases score 100/0", () => {
  const result = analyzeAccumulationDistribution([position({ currentValue: 200, priorValue: 100 })]);
  assert.equal(result.accumulationScore, 100);
  assert.equal(result.distributionScore, 0);
  assert.equal(result.totalIncreaseValue, 100);
});

test("analyzeAccumulationDistribution: real, pure decreases score 0/100", () => {
  const result = analyzeAccumulationDistribution([position({ currentValue: 50, priorValue: 100 })]);
  assert.equal(result.accumulationScore, 0);
  assert.equal(result.distributionScore, 100);
  assert.equal(result.totalDecreaseValue, 50);
});

test("analyzeAccumulationDistribution: real, mixed activity splits proportionally by real dollar magnitude", () => {
  const result = analyzeAccumulationDistribution([position({ currentValue: 300, priorValue: 200 }), position({ currentValue: 100, priorValue: 200 })]); // +100 increase, -100 decrease
  assert.equal(result.accumulationScore, 50);
  assert.equal(result.distributionScore, 50);
});

test("analyzeAccumulationDistribution treats a real, exact-unchanged position as neither accumulation nor distribution", () => {
  const result = analyzeAccumulationDistribution([position({ currentValue: 100, priorValue: 100 })]);
  assert.equal(result.totalIncreaseValue, 0);
  assert.equal(result.totalDecreaseValue, 0);
});
