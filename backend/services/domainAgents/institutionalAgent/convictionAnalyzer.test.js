const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeConviction } = require("./convictionAnalyzer");

function position({ checked = true, current, prior }) {
  return { checked, currentQuarter: current, priorQuarter: prior };
}

test("analyzeConviction honestly reports 0/0 with no real checked managers", () => {
  const result = analyzeConviction([position({ checked: false, current: { shares: 10 }, prior: { shares: 5 } })]);
  assert.equal(result.participationRate, 0);
  assert.equal(result.convictionScore, 0);
});

test("analyzeConviction: real participation rate is the fraction of checked managers currently holding", () => {
  const result = analyzeConviction([
    position({ current: { shares: 100 }, prior: { shares: 100 } }),
    position({ current: { shares: 0 }, prior: { shares: 0 } }),
  ]);
  assert.equal(result.participationRate, 50);
  assert.equal(result.holdingCount, 1);
});

test("analyzeConviction: unanimous real direction among comparable managers scores full conviction", () => {
  const result = analyzeConviction([
    position({ current: { shares: 200 }, prior: { shares: 100 } }), // INCREASED
    position({ current: { shares: 150 }, prior: { shares: 50 } }), // INCREASED
  ]);
  assert.equal(result.convictionScore, 100);
});

test("analyzeConviction: an even real split in direction scores 50", () => {
  const result = analyzeConviction([
    position({ current: { shares: 200 }, prior: { shares: 100 } }), // INCREASED
    position({ current: { shares: 50 }, prior: { shares: 100 } }), // DECREASED
  ]);
  assert.equal(result.convictionScore, 50);
});

test("analyzeConviction honestly reports 0 conviction with no real directional (increased/decreased) managers", () => {
  const result = analyzeConviction([position({ current: { shares: 100 }, prior: { shares: 100 } })]); // UNCHANGED only
  assert.equal(result.convictionScore, 0);
});
