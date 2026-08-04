const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeGrowth, clampGrowthToScore } = require("./growthAnalyzer");
const { emptyMetrics } = require("./earningsDataProvider");

function metricsWith(revenueGrowthYoY, epsGrowthYoY) {
  const base = emptyMetrics("NVDA", null);
  base.dataAvailable = true;
  base.revenue.growthYoY = revenueGrowthYoY;
  base.eps.growthYoY = epsGrowthYoY;
  return base;
}

test("no data available => null growth score, no fabricated read", () => {
  const result = analyzeGrowth(emptyMetrics("NVDA", "not connected"));
  assert.equal(result.growthScore, null);
});

test("clampGrowthToScore maps 0% growth to the real midpoint (50)", () => {
  assert.equal(clampGrowthToScore(0), 50);
});

test("clampGrowthToScore maps growth at/above the cap to 100, at/below the floor to 0", () => {
  assert.equal(clampGrowthToScore(40), 100);
  assert.equal(clampGrowthToScore(1000), 100);
  assert.equal(clampGrowthToScore(-40), 0);
  assert.equal(clampGrowthToScore(-1000), 0);
});

test("clampGrowthToScore returns null for null/undefined input, never a fabricated default", () => {
  assert.equal(clampGrowthToScore(null), null);
  assert.equal(clampGrowthToScore(undefined), null);
});

test("both revenue and EPS growth present => growthScore is their real average", () => {
  const result = analyzeGrowth(metricsWith(20, 0)); // scores: 87.5-ish and 50
  const revenueScore = clampGrowthToScore(20);
  const epsScore = clampGrowthToScore(0);
  assert.equal(result.growthScore, Math.round((revenueScore + epsScore) / 2));
  assert.equal(result.contributions.revenueGrowth, revenueScore);
  assert.equal(result.contributions.epsGrowth, epsScore);
});

test("only revenue growth available => growthScore is honestly based on that alone", () => {
  const result = analyzeGrowth(metricsWith(30, null));
  assert.equal(result.growthScore, clampGrowthToScore(30));
  assert.ok(!("epsGrowth" in result.contributions));
});

test("neither revenue nor EPS growth available => null, not zero or a guessed default", () => {
  const result = analyzeGrowth(metricsWith(null, null));
  assert.equal(result.growthScore, null);
  assert.deepEqual(result.contributions, {});
});

test("strong positive growth on both dimensions produces a high score", () => {
  const result = analyzeGrowth(metricsWith(35, 35));
  assert.ok(result.growthScore > 80);
});

test("strong negative growth on both dimensions produces a low score", () => {
  const result = analyzeGrowth(metricsWith(-35, -35));
  assert.ok(result.growthScore < 20);
});
