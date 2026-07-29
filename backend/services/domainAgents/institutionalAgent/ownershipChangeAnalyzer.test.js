const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeOwnershipTrend } = require("./ownershipChangeAnalyzer");

function position({ checked = true, currentShares, priorShares }) {
  return { checked, currentQuarter: currentShares === undefined ? null : { shares: currentShares }, priorQuarter: priorShares === undefined ? null : { shares: priorShares } };
}

test("analyzeOwnershipTrend honestly reports UNKNOWN with no real comparable managers", () => {
  const result = analyzeOwnershipTrend([position({ checked: false, currentShares: 10, priorShares: 5 })]);
  assert.equal(result.trend, "UNKNOWN");
  assert.equal(result.comparableManagerCount, 0);
});

test("analyzeOwnershipTrend: real aggregate growth across comparable managers reports INCREASING", () => {
  const result = analyzeOwnershipTrend([position({ currentShares: 100, priorShares: 50 }), position({ currentShares: 200, priorShares: 200 })]);
  assert.equal(result.trend, "INCREASING");
  assert.equal(result.currentTotalShares, 300);
  assert.equal(result.priorTotalShares, 250);
});

test("analyzeOwnershipTrend: real aggregate decline reports DECREASING", () => {
  const result = analyzeOwnershipTrend([position({ currentShares: 50, priorShares: 100 })]);
  assert.equal(result.trend, "DECREASING");
});

test("analyzeOwnershipTrend: real unchanged aggregate reports STABLE", () => {
  const result = analyzeOwnershipTrend([position({ currentShares: 100, priorShares: 100 })]);
  assert.equal(result.trend, "STABLE");
});

test("analyzeOwnershipTrend excludes an unchecked or incomparable real manager from the aggregate, never treating it as zero", () => {
  const result = analyzeOwnershipTrend([position({ currentShares: 100, priorShares: 50 }), position({ checked: false, currentShares: 999999, priorShares: 999999 })]);
  assert.equal(result.comparableManagerCount, 1);
  assert.equal(result.currentTotalShares, 100);
});
