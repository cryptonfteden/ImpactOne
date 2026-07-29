const test = require("node:test");
const assert = require("node:assert/strict");
const { computeSentimentScore, computeSentimentState, analyzeTrendAndVelocity } = require("./sentimentTrendAnalyzer");

test("computeSentimentScore returns the honest midpoint (50) for zero real articles, never a fabricated lean", () => {
  assert.equal(computeSentimentScore([]), 50);
});

test("computeSentimentScore maps a real fully-positive article set toward 100", () => {
  const score = computeSentimentScore([{ score: 1 }, { score: 1 }]);
  assert.equal(score, 100);
});

test("computeSentimentScore maps a real fully-negative article set toward 0", () => {
  const score = computeSentimentScore([{ score: -1 }]);
  assert.equal(score, 0);
});

test("computeSentimentState: >=60 POSITIVE, <=40 NEGATIVE, else NEUTRAL (disclosed thresholds)", () => {
  assert.equal(computeSentimentState(60), "POSITIVE");
  assert.equal(computeSentimentState(80), "POSITIVE");
  assert.equal(computeSentimentState(40), "NEGATIVE");
  assert.equal(computeSentimentState(20), "NEGATIVE");
  assert.equal(computeSentimentState(50), "NEUTRAL");
});

function day(date, averageScore, articleCount = 1) {
  return { date, averageScore, articleCount };
}

test("analyzeTrendAndVelocity: honestly reports insufficient data with fewer than 2 real days of data", () => {
  const result = analyzeTrendAndVelocity([day("2026-01-01", null, 0)]);
  assert.equal(result.trend, "STABLE");
  assert.equal(result.velocity.value, null);
  assert.equal(result.velocity.insufficientData, true);
});

test("analyzeTrendAndVelocity: a real, genuine rise in daily average score across the window reports IMPROVING", () => {
  const series = [day("2026-01-01", -0.8), day("2026-01-02", -0.7), day("2026-01-03", 0.7), day("2026-01-04", 0.8)];
  const result = analyzeTrendAndVelocity(series);
  assert.equal(result.trend, "IMPROVING");
  assert.equal(result.velocity.insufficientData, false);
  assert.ok(result.velocity.value > 0);
});

test("analyzeTrendAndVelocity: a real, genuine fall in daily average score across the window reports DETERIORATING", () => {
  const series = [day("2026-01-01", 0.8), day("2026-01-02", 0.7), day("2026-01-03", -0.7), day("2026-01-04", -0.8)];
  const result = analyzeTrendAndVelocity(series);
  assert.equal(result.trend, "DETERIORATING");
  assert.ok(result.velocity.value < 0);
});

test("analyzeTrendAndVelocity: a real, roughly flat score across the window reports STABLE", () => {
  const series = [day("2026-01-01", 0.1), day("2026-01-02", 0.12), day("2026-01-03", 0.11), day("2026-01-04", 0.09)];
  const result = analyzeTrendAndVelocity(series);
  assert.equal(result.trend, "STABLE");
});

test("analyzeTrendAndVelocity skips real days with no data when computing the trend", () => {
  const series = [day("2026-01-01", -0.8), day("2026-01-02", null, 0), day("2026-01-03", 0.8)];
  const result = analyzeTrendAndVelocity(series);
  assert.equal(result.velocity.insufficientData, false);
});
