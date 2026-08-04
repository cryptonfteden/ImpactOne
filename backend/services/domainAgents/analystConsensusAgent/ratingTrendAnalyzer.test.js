const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeRatingTrend } = require("./ratingTrendAnalyzer");

function period(p, strongBuy, buy, hold, sell, strongSell) {
  return { period: p, strongBuy, buy, hold, sell, strongSell };
}

test("classifies IMPROVING when the real consensus score rises between periods", () => {
  const periods = [period("2026-06-01", 0, 0, 10, 0, 0), period("2026-07-01", 10, 0, 0, 0, 0)];
  const result = analyzeRatingTrend(periods);
  assert.equal(result.ratingTrend, "IMPROVING");
  assert.ok(result.revisionScore > 0);
});

test("classifies DETERIORATING when the real consensus score falls between periods", () => {
  const periods = [period("2026-06-01", 10, 0, 0, 0, 0), period("2026-07-01", 0, 0, 10, 0, 0)];
  const result = analyzeRatingTrend(periods);
  assert.equal(result.ratingTrend, "DETERIORATING");
  assert.ok(result.revisionScore < 0);
});

test("classifies STABLE within the noise band", () => {
  const periods = [period("2026-06-01", 5, 5, 5, 0, 0), period("2026-07-01", 5, 5, 5, 0, 0)];
  const result = analyzeRatingTrend(periods);
  assert.equal(result.ratingTrend, "STABLE");
  assert.equal(result.revisionScore, 0);
});

test("honestly reports UNKNOWN with fewer than 2 real periods", () => {
  const result = analyzeRatingTrend([period("2026-07-01", 5, 5, 5, 0, 0)]);
  assert.equal(result.ratingTrend, "UNKNOWN");
  assert.equal(result.revisionScore, null);
});
