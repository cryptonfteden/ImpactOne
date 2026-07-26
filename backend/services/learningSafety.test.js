const test = require("node:test");
const assert = require("node:assert/strict");

const learningSafety = require("./learningSafety");

test("meetsMinimumSample enforces the real threshold", () => {
  assert.equal(learningSafety.meetsMinimumSample(14), false);
  assert.equal(learningSafety.meetsMinimumSample(15), true);
});

test("wilsonConfidenceInterval stays within [0, 1] even at small n and extreme rates", () => {
  const { lower, upper } = learningSafety.wilsonConfidenceInterval(15, 15);
  assert.ok(lower >= 0 && lower <= 1);
  assert.ok(upper >= 0 && upper <= 1);
  assert.ok(lower < 1); // a perfect small sample still carries real uncertainty
});

test("wilsonConfidenceInterval honestly returns nulls for zero samples", () => {
  const { lower, upper } = learningSafety.wilsonConfidenceInterval(0, 0);
  assert.equal(lower, null);
  assert.equal(upper, null);
});

test("boundedAdjustmentFromRate never exceeds the disclosed cap, even at 100% observed rate", () => {
  const adjustment = learningSafety.boundedAdjustmentFromRate(1);
  assert.equal(adjustment, learningSafety.MAX_ADJUSTMENT_PTS);
});

test("boundedAdjustmentFromRate is zero at the neutral baseline", () => {
  assert.equal(learningSafety.boundedAdjustmentFromRate(0.5), 0);
});

test("boundedAdjustmentFromRate is negative below baseline, bounded at the negative cap", () => {
  const adjustment = learningSafety.boundedAdjustmentFromRate(0);
  assert.equal(adjustment, -learningSafety.MAX_ADJUSTMENT_PTS);
});
