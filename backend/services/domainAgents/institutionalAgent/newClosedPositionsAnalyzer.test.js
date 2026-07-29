const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeNewClosedPositions } = require("./newClosedPositionsAnalyzer");

function position(managerName, { checked = true, current, prior }) {
  return { managerName, checked, currentQuarter: current, priorQuarter: prior };
}

test("analyzeNewClosedPositions honestly reports empty lists with no real qualifying managers", () => {
  const result = analyzeNewClosedPositions([position("A", { current: { shares: 100 }, prior: { shares: 100 } })]);
  assert.deepEqual(result.newPositions, []);
  assert.deepEqual(result.closedPositions, []);
});

test("analyzeNewClosedPositions identifies a real new position (zero to positive)", () => {
  const result = analyzeNewClosedPositions([position("Alice Capital", { current: { shares: 500, value: 5000 }, prior: { shares: 0, value: 0 } })]);
  assert.equal(result.newPositions.length, 1);
  assert.equal(result.newPositions[0].managerName, "Alice Capital");
  assert.equal(result.newPositions[0].shares, 500);
});

test("analyzeNewClosedPositions identifies a real closed position (positive to zero)", () => {
  const result = analyzeNewClosedPositions([position("Bob Capital", { current: { shares: 0, value: 0 }, prior: { shares: 500, value: 5000 } })]);
  assert.equal(result.closedPositions.length, 1);
  assert.equal(result.closedPositions[0].managerName, "Bob Capital");
  assert.equal(result.closedPositions[0].priorShares, 500);
});

test("analyzeNewClosedPositions ignores an unchecked real manager", () => {
  const result = analyzeNewClosedPositions([position("Carol Capital", { checked: false, current: { shares: 500 }, prior: { shares: 0 } })]);
  assert.deepEqual(result.newPositions, []);
});
