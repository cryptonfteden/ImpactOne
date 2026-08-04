const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeSqueezeProbability } = require("./squeezeProbabilityAnalyzer");

test("analyzeSqueezeProbability: real max crowdedness plus a real strong price rise reaches the full 100", () => {
  const result = analyzeSqueezeProbability(100, 10);
  assert.equal(result.squeezeProbability, 100);
  assert.equal(result.priceDataUsed, true);
});

test("analyzeSqueezeProbability: real max crowdedness plus a real strong price fall stays at the crowdedness-only floor", () => {
  const result = analyzeSqueezeProbability(100, -10);
  assert.equal(result.squeezeProbability, 60); // 100*0.6 + 0
});

test("analyzeSqueezeProbability: with no real price data, honestly falls back to the neutral price-momentum midpoint", () => {
  const result = analyzeSqueezeProbability(100, null);
  assert.equal(result.priceDataUsed, false);
  assert.equal(result.squeezeProbability, 80); // 100*0.6 + 20 (neutral midpoint of the 0-40 range)
});

test("analyzeSqueezeProbability: zero real crowdedness and a real neutral price reports a low real probability", () => {
  const result = analyzeSqueezeProbability(0, 0);
  assert.equal(result.squeezeProbability, 20); // 0*0.6 + 20
});

test("analyzeSqueezeProbability clamps a real price move beyond the disclosed clamp range", () => {
  const clamped = analyzeSqueezeProbability(0, 50);
  const atClampBoundary = analyzeSqueezeProbability(0, 10);
  assert.equal(clamped.squeezeProbability, atClampBoundary.squeezeProbability);
});

test("analyzeSqueezeProbability is always in [0, 100]", () => {
  const result = analyzeSqueezeProbability(100, 10);
  assert.ok(result.squeezeProbability >= 0 && result.squeezeProbability <= 100);
});
