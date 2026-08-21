const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeAccumulationDistribution } = require("./accumulationDistributionAnalyzer");

function position({ checked = true, currentShares, priorShares, currentValue = 0, priorValue = 0 }) {
  return { checked, currentQuarter: currentShares === undefined ? null : { shares: currentShares, value: currentValue }, priorQuarter: priorShares === undefined ? null : { shares: priorShares, value: priorValue } };
}

test("analyzeAccumulationDistribution honestly reports 0/0 with no real comparable activity", () => {
  const result = analyzeAccumulationDistribution([position({ checked: false, currentShares: 100, priorShares: 50 })]);
  assert.equal(result.accumulationScore, 0);
  assert.equal(result.distributionScore, 0);
});

test("analyzeAccumulationDistribution: real, pure increases score 100/0", () => {
  const result = analyzeAccumulationDistribution([position({ currentShares: 200, priorShares: 100 })]);
  assert.equal(result.accumulationScore, 100);
  assert.equal(result.distributionScore, 0);
  assert.equal(result.totalIncreaseShares, 100);
});

test("analyzeAccumulationDistribution: real, pure decreases score 0/100", () => {
  const result = analyzeAccumulationDistribution([position({ currentShares: 50, priorShares: 100 })]);
  assert.equal(result.accumulationScore, 0);
  assert.equal(result.distributionScore, 100);
  assert.equal(result.totalDecreaseShares, 50);
});

test("analyzeAccumulationDistribution: real, mixed activity splits proportionally by reported-share magnitude", () => {
  const result = analyzeAccumulationDistribution([position({ currentShares: 300, priorShares: 200 }), position({ currentShares: 100, priorShares: 200 })]);
  assert.equal(result.accumulationScore, 50);
  assert.equal(result.distributionScore, 50);
});

test("analyzeAccumulationDistribution treats a real, exact-unchanged position as neither accumulation nor distribution", () => {
  const result = analyzeAccumulationDistribution([position({ currentShares: 100, priorShares: 100 })]);
  assert.equal(result.totalIncreaseShares, 0);
  assert.equal(result.totalDecreaseShares, 0);
});

test("price appreciation alone is never misclassified as institutional accumulation", () => {
  const result = analyzeAccumulationDistribution([position({ currentShares: 100, priorShares: 100, currentValue: 50000, priorValue: 10000 })]);
  assert.equal(result.accumulationScore, 0);
  assert.equal(result.distributionScore, 0);
});
