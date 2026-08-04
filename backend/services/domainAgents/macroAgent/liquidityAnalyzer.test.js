const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeLiquidity } = require("./liquidityAnalyzer");

function series(changeYoY, dataAvailable = true) {
  return { dataAvailable, changeYoY };
}

test("maps 0% real YoY growth to the floor score", () => {
  assert.equal(analyzeLiquidity(series(0)).liquidityScore, 25);
});

test("maps 8% real YoY growth to the ceiling score", () => {
  assert.equal(analyzeLiquidity(series(8)).liquidityScore, 100);
});

test("clamps below the floor for real negative M2 contraction", () => {
  assert.equal(analyzeLiquidity(series(-10)).liquidityScore, 0);
});

test("honestly reports null when real data is unavailable", () => {
  const result = analyzeLiquidity(series(null, false));
  assert.equal(result.liquidityScore, null);
});
