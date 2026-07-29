const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeShortInterestTrend } = require("./shortInterestTrendAnalyzer");

function day(ratio) {
  return { shortVolumeRatio: ratio };
}

test("analyzeShortInterestTrend honestly reports UNKNOWN with fewer than 2 real days", () => {
  const result = analyzeShortInterestTrend([day(0.3)]);
  assert.equal(result.trend, "UNKNOWN");
  assert.equal(result.delta, null);
});

test("analyzeShortInterestTrend: a real, genuine rise in average ratio reports INCREASING", () => {
  const result = analyzeShortInterestTrend([day(0.2), day(0.2), day(0.5), day(0.5)]);
  assert.equal(result.trend, "INCREASING");
  assert.ok(result.delta > 0);
});

test("analyzeShortInterestTrend: a real, genuine fall in average ratio reports DECREASING", () => {
  const result = analyzeShortInterestTrend([day(0.5), day(0.5), day(0.2), day(0.2)]);
  assert.equal(result.trend, "DECREASING");
  assert.ok(result.delta < 0);
});

test("analyzeShortInterestTrend: a real, small move within the disclosed threshold reports STABLE", () => {
  const result = analyzeShortInterestTrend([day(0.3), day(0.3), day(0.31), day(0.31)]);
  assert.equal(result.trend, "STABLE");
});

test("analyzeShortInterestTrend reports the real prior/recent half averages", () => {
  const result = analyzeShortInterestTrend([day(0.1), day(0.2), day(0.3), day(0.4)]);
  assert.equal(result.priorAvgRatio, 0.15);
  assert.equal(result.recentAvgRatio, 0.35);
});
