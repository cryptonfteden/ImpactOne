const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeSentimentPriceDivergence, computePriceDirection } = require("./sentimentPriceDivergenceAnalyzer");

function bars(closes) {
  return closes.map((close, i) => ({ date: `2026-01-${String(i + 1).padStart(2, "0")}`, open: close, high: close, low: close, close, volume: 100 }));
}

test("computePriceDirection honestly reports null with fewer than 2 real bars", () => {
  assert.deepEqual(computePriceDirection([]), { priceDirection: null, priceChangePercent: null });
  assert.deepEqual(computePriceDirection(bars([100])), { priceDirection: null, priceChangePercent: null });
});

test("computePriceDirection reports a real UP direction for a genuine rise beyond the flat threshold", () => {
  const result = computePriceDirection(bars([100, 110]));
  assert.equal(result.priceDirection, "UP");
  assert.equal(result.priceChangePercent, 10);
});

test("computePriceDirection reports a real DOWN direction for a genuine fall beyond the flat threshold", () => {
  const result = computePriceDirection(bars([100, 90]));
  assert.equal(result.priceDirection, "DOWN");
  assert.equal(result.priceChangePercent, -10);
});

test("computePriceDirection reports FLAT for a real move within the disclosed flat threshold", () => {
  const result = computePriceDirection(bars([100, 100.5]));
  assert.equal(result.priceDirection, "FLAT");
});

test("analyzeSentimentPriceDivergence flags BULLISH_DIVERGENCE: real price fell while sentiment genuinely improved", () => {
  const result = analyzeSentimentPriceDivergence("IMPROVING", bars([100, 90]));
  assert.equal(result.divergence, "BULLISH_DIVERGENCE");
});

test("analyzeSentimentPriceDivergence flags BEARISH_DIVERGENCE: real price rose while sentiment genuinely deteriorated", () => {
  const result = analyzeSentimentPriceDivergence("DETERIORATING", bars([100, 110]));
  assert.equal(result.divergence, "BEARISH_DIVERGENCE");
});

test("analyzeSentimentPriceDivergence reports NONE when price and sentiment do not genuinely disagree", () => {
  assert.equal(analyzeSentimentPriceDivergence("IMPROVING", bars([100, 110])).divergence, "NONE");
  assert.equal(analyzeSentimentPriceDivergence("STABLE", bars([100, 90])).divergence, "NONE");
});
