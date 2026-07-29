const test = require("node:test");
const assert = require("node:assert/strict");
const { buildBullishFactors, buildBearishFactors, buildRisks } = require("./bullishBearishFactorsBuilder");

function baseInputs(overrides = {}) {
  return {
    sentimentState: "NEUTRAL",
    sentimentScore: 50,
    trend: "STABLE",
    velocity: { value: 0, unit: "score points per day", insufficientData: false },
    articleRatio: { positiveCount: 0, negativeCount: 0, neutralCount: 0, ratio: null },
    divergence: "NONE",
    priceChangePercent: 0,
    ...overrides,
  };
}

test("buildBullishFactors includes a real POSITIVE sentiment state clause", () => {
  const factors = buildBullishFactors(baseInputs({ sentimentState: "POSITIVE", sentimentScore: 80 }));
  assert.ok(factors.some((f) => f.includes("positive") && f.includes("80")));
});

test("buildBullishFactors includes a real IMPROVING trend clause", () => {
  const factors = buildBullishFactors(baseInputs({ trend: "IMPROVING", velocity: { value: 5, unit: "score points per day" } }));
  assert.ok(factors.some((f) => f.includes("improving")));
});

test("buildBullishFactors includes a real strong positive/negative ratio clause only above the disclosed threshold", () => {
  const strong = buildBullishFactors(baseInputs({ articleRatio: { positiveCount: 6, negativeCount: 2, ratio: 3 } }));
  const weak = buildBullishFactors(baseInputs({ articleRatio: { positiveCount: 3, negativeCount: 2.5, ratio: 1.2 } }));
  assert.ok(strong.some((f) => f.includes("outnumber")));
  assert.ok(!weak.some((f) => f.includes("outnumber")));
});

test("buildBullishFactors includes a real bullish divergence clause", () => {
  const factors = buildBullishFactors(baseInputs({ divergence: "BULLISH_DIVERGENCE", priceChangePercent: -8 }));
  assert.ok(factors.some((f) => f.includes("Bullish sentiment-price divergence")));
});

test("buildBullishFactors returns an empty array when nothing real is bullish, never inventing one", () => {
  assert.deepEqual(buildBullishFactors(baseInputs()), []);
});

test("buildBearishFactors mirrors buildBullishFactors for the negative side", () => {
  const factors = buildBearishFactors(baseInputs({ sentimentState: "NEGATIVE", sentimentScore: 20, trend: "DETERIORATING", velocity: { value: -5 }, articleRatio: { positiveCount: 1, negativeCount: 5 }, divergence: "BEARISH_DIVERGENCE", priceChangePercent: 8 }));
  assert.ok(factors.some((f) => f.includes("negative")));
  assert.ok(factors.some((f) => f.includes("deteriorating")));
  assert.ok(factors.some((f) => f.includes("outnumber")));
  assert.ok(factors.some((f) => f.includes("Bearish sentiment-price divergence")));
});

test("buildRisks flags real social unavailability, low source diversity, and small sample size", () => {
  const risks = buildRisks({
    socialSentimentAvailable: false,
    socialUnavailableReason: "no real source",
    sourceQuality: { distinctSourceCount: 1 },
    articleCount: 2,
    abnormalActivity: { volumeSpikes: [] },
  });
  assert.ok(risks.some((r) => r.includes("Social sentiment")));
  assert.ok(risks.some((r) => r.includes("Low source diversity")));
  assert.ok(risks.some((r) => r.includes("Small real sample size")));
});

test("buildRisks flags a real volume spike with its real date and z-score", () => {
  const risks = buildRisks({
    socialSentimentAvailable: true,
    socialUnavailableReason: null,
    sourceQuality: { distinctSourceCount: 10 },
    articleCount: 20,
    abnormalActivity: { volumeSpikes: [{ date: "2026-01-05", zScore: 3.2 }] },
  });
  assert.ok(risks.some((r) => r.includes("2026-01-05") && r.includes("3.2")));
});

test("buildRisks reports no risks when every real input is healthy", () => {
  const risks = buildRisks({
    socialSentimentAvailable: true,
    socialUnavailableReason: null,
    sourceQuality: { distinctSourceCount: 10 },
    articleCount: 20,
    abnormalActivity: { volumeSpikes: [] },
  });
  assert.deepEqual(risks, []);
});
