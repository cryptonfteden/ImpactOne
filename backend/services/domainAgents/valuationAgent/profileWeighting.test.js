const test = require("node:test");
const assert = require("node:assert/strict");
const { getProfileWeights, classifyProfile } = require("./profileWeighting");
const { emptyMetrics } = require("./valuationDataProvider");

function metricsWith(industry, epsTrailing) {
  const base = emptyMetrics("NVDA", null);
  base.dataAvailable = true;
  base.industry = industry;
  base.eps.trailing = epsTrailing;
  return base;
}

test("a bank/insurance/financial industry is classified ASSET_HEAVY regardless of profitability", () => {
  assert.equal(classifyProfile(metricsWith("Banks", 5)), "ASSET_HEAVY");
  assert.equal(classifyProfile(metricsWith("Insurance", 5)), "ASSET_HEAVY");
  assert.equal(classifyProfile(metricsWith("Financial Services", -5)), "ASSET_HEAVY");
});

test("a non-financial company with negative or null trailing EPS is classified UNPROFITABLE", () => {
  assert.equal(classifyProfile(metricsWith("Software", -3)), "UNPROFITABLE");
  assert.equal(classifyProfile(metricsWith("Software", null)), "UNPROFITABLE");
});

test("a non-financial, profitable company is classified PROFITABLE_STABLE", () => {
  assert.equal(classifyProfile(metricsWith("Software", 4)), "PROFITABLE_STABLE");
});

test("PROFITABLE_STABLE weights P/E, Forward P/E, EV/EBITDA, and FCF Yield roughly equally, higher than P/S and P/B", () => {
  const { weights } = getProfileWeights(metricsWith("Software", 4));
  assert.equal(weights.PE, weights.FORWARD_PE);
  assert.equal(weights.PE, weights.EV_EBITDA);
  assert.ok(weights.PE > weights.PS);
  assert.ok(weights.PE > weights.PB);
});

test("UNPROFITABLE weighting excludes P/E and PEG entirely (weight 0) and shifts primary weight to P/S", () => {
  const { weights } = getProfileWeights(metricsWith("Software", -3));
  assert.equal(weights.PE, 0);
  assert.equal(weights.PEG, 0);
  assert.ok(weights.PS > weights.PB);
  assert.ok(weights.PS >= weights.FCF_YIELD);
});

test("ASSET_HEAVY weighting favors P/B over EV/EBITDA (the opposite of the normal profile)", () => {
  const { weights } = getProfileWeights(metricsWith("Banks", 4));
  assert.ok(weights.PB > weights.EV_EBITDA);
});

test("getProfileWeights returns the real classified profile name alongside the weights", () => {
  const { profile } = getProfileWeights(metricsWith("Software", 4));
  assert.equal(profile, "PROFITABLE_STABLE");
});
