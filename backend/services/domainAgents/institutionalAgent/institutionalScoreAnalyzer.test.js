const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeInstitutionalScore } = require("./institutionalScoreAnalyzer");

function accDist(totalIncreaseValue, totalDecreaseValue) {
  return { totalIncreaseValue, totalDecreaseValue };
}
function newClosed(newCount, closedCount) {
  return { newPositions: Array(newCount).fill({}), closedPositions: Array(closedCount).fill({}) };
}

test("analyzeInstitutionalScore: no real activity at all reports NEUTRAL at score 0", () => {
  const result = analyzeInstitutionalScore(accDist(0, 0), newClosed(0, 0));
  assert.equal(result.institutionalBias, "NEUTRAL");
  assert.equal(result.institutionalScore, 0);
});

test("analyzeInstitutionalScore: real pure accumulation plus real net-new positions reports BULLISH", () => {
  const result = analyzeInstitutionalScore(accDist(1000, 0), newClosed(3, 0));
  assert.equal(result.institutionalBias, "BULLISH");
  assert.ok(result.institutionalScore > 0);
});

test("analyzeInstitutionalScore: real pure distribution plus real net-closed positions reports BEARISH", () => {
  const result = analyzeInstitutionalScore(accDist(0, 1000), newClosed(0, 3));
  assert.equal(result.institutionalBias, "BEARISH");
  assert.ok(result.institutionalScore < 0);
});

test("analyzeInstitutionalScore is always clamped to [-100, 100]", () => {
  const result = analyzeInstitutionalScore(accDist(1_000_000, 0), newClosed(50, 0));
  assert.ok(result.institutionalScore <= 100 && result.institutionalScore >= -100);
});

test("analyzeInstitutionalScore weights real dollar-value direction and real net position count, never a naive average of unrelated scales", () => {
  // Pure value accumulation (weight 0.6) alone should not reach the full 100.
  const result = analyzeInstitutionalScore(accDist(1000, 0), newClosed(0, 0));
  assert.equal(result.institutionalScore, 60); // 100 * 0.6 + 0 * 0.4
});
