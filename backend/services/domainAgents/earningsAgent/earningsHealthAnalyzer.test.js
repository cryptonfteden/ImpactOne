const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeEarningsHealth, marginToScore } = require("./earningsHealthAnalyzer");
const { emptyMetrics } = require("./earningsDataProvider");

test("marginToScore maps 0% margin to a real, non-arbitrary point below the midpoint (loss-risk starts negative)", () => {
  const zero = marginToScore(0);
  const positive = marginToScore(20);
  assert.ok(zero < positive);
});

test("marginToScore returns null for null/undefined, never a fabricated default", () => {
  assert.equal(marginToScore(null), null);
  assert.equal(marginToScore(undefined), null);
});

test("with zero real components available, earnings health is honestly UNKNOWN", () => {
  const metrics = emptyMetrics("NVDA", "not connected");
  const result = analyzeEarningsHealth(metrics, { growthScore: null }, { rating: "UNKNOWN" });
  assert.equal(result.earningsHealth, "UNKNOWN");
  assert.equal(result.healthScore, null);
});

test("strong margin, strong growth, and high consistency together produce STRONG", () => {
  const metrics = emptyMetrics("NVDA", null);
  metrics.dataAvailable = true;
  metrics.margins.netProfitMargin = 28;
  const result = analyzeEarningsHealth(metrics, { growthScore: 90 }, { rating: "HIGH" });
  assert.equal(result.earningsHealth, "STRONG");
});

test("weak margin, weak growth, and low consistency together produce WEAK", () => {
  const metrics = emptyMetrics("NVDA", null);
  metrics.dataAvailable = true;
  metrics.margins.netProfitMargin = -8;
  const result = analyzeEarningsHealth(metrics, { growthScore: 5 }, { rating: "LOW" });
  assert.equal(result.earningsHealth, "WEAK");
});

test("a mixed, middling profile produces STABLE, not STRONG or WEAK", () => {
  const metrics = emptyMetrics("NVDA", null);
  metrics.dataAvailable = true;
  metrics.margins.netProfitMargin = 8;
  const result = analyzeEarningsHealth(metrics, { growthScore: 50 }, { rating: "MODERATE" });
  assert.equal(result.earningsHealth, "STABLE");
});

test("only margin data is available (growth/consistency unknown) => health is still computed honestly from that one real component", () => {
  const metrics = emptyMetrics("NVDA", null);
  metrics.dataAvailable = true;
  metrics.margins.netProfitMargin = 25;
  const result = analyzeEarningsHealth(metrics, { growthScore: null }, { rating: "UNKNOWN" });
  assert.notEqual(result.earningsHealth, "UNKNOWN");
  assert.deepEqual(Object.keys(result.contributions), ["margin"]);
});
