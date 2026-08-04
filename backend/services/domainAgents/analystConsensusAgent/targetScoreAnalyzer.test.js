const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeTargetScore } = require("./targetScoreAnalyzer");

test("computes a real Target Score and dispersion when real price-target data is available", () => {
  const result = analyzeTargetScore({ dataAvailable: true, unavailableReason: null, targetHigh: 220, targetLow: 200, targetMean: 210 });
  assert.equal(result.targetDispersion, Math.round((20 / 210) * 10000) / 100);
  assert.equal(result.targetScore, Math.round(100 - result.targetDispersion));
  assert.equal(result.unavailableReason, null);
});

test("honestly reports unavailable (null) when real price-target data is unavailable", () => {
  const result = analyzeTargetScore({ dataAvailable: false, unavailableReason: "403 paid plan required", targetHigh: null, targetLow: null, targetMean: null });
  assert.equal(result.targetScore, null);
  assert.equal(result.targetDispersion, null);
  assert.match(result.unavailableReason, /403/);
});

test("floors the Target Score at 0 for a very wide real spread", () => {
  const result = analyzeTargetScore({ dataAvailable: true, unavailableReason: null, targetHigh: 500, targetLow: 50, targetMean: 100 });
  assert.equal(result.targetScore, 0);
});
