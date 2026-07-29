const test = require("node:test");
const assert = require("node:assert/strict");
const { computeConfidence } = require("./confidenceModel");

test("computeConfidence: no real data reports 0 confidence, honestly", () => {
  const { confidence } = computeConfidence({ dataAvailable: false, daysCount: 0, trendKnown: false, priceDataUsed: false });
  assert.equal(confidence, 0);
});

test("computeConfidence: full real sample, known trend, and real price data reaches the ceiling minus the fixed structural penalty", () => {
  const { confidence, components } = computeConfidence({ dataAvailable: true, daysCount: 15, trendKnown: true, priceDataUsed: true });
  assert.equal(confidence, 75); // 30 + 25 + 15 + 15 - 10
  assert.equal(components.structuralPenalty, 10);
});

test("computeConfidence: a real partial sample size scores lower than a full one", () => {
  const full = computeConfidence({ dataAvailable: true, daysCount: 15, trendKnown: true, priceDataUsed: true });
  const partial = computeConfidence({ dataAvailable: true, daysCount: 5, trendKnown: true, priceDataUsed: true });
  assert.ok(partial.confidence < full.confidence);
});

test("computeConfidence: real price-data availability adds the disclosed bonus", () => {
  const withPrice = computeConfidence({ dataAvailable: true, daysCount: 15, trendKnown: true, priceDataUsed: true });
  const withoutPrice = computeConfidence({ dataAvailable: true, daysCount: 15, trendKnown: true, priceDataUsed: false });
  assert.equal(withPrice.confidence - withoutPrice.confidence, 15);
});

test("computeConfidence is always clamped to [0, 100]", () => {
  const { confidence } = computeConfidence({ dataAvailable: true, daysCount: 100, trendKnown: true, priceDataUsed: true });
  assert.ok(confidence <= 100);
});
