const test = require("node:test");
const assert = require("node:assert/strict");
const { buildBullishFactors, buildBearishFactors, buildRisks } = require("./factorsRisksBuilder");

test("buildBullishFactors: produces a non-empty real list when conditions are favorable", () => {
  const factors = buildBullishFactors({ newsBias: "BULLISH", newsScore: 40, positiveCount: 3, importanceScore: 70, confirmationScore: 70 });
  assert.equal(factors.length, 3);
});

test("buildBullishFactors: produces an empty list when nothing real is favorable", () => {
  const factors = buildBullishFactors({ newsBias: "BEARISH", newsScore: -40, positiveCount: 0, importanceScore: 10, confirmationScore: 10 });
  assert.deepEqual(factors, []);
});

test("buildBearishFactors: produces a non-empty real list when conditions are unfavorable", () => {
  const factors = buildBearishFactors({ newsBias: "BEARISH", newsScore: -40, negativeCount: 3, importanceScore: 70, confirmationScore: 10 });
  assert.equal(factors.length, 3);
});

test("buildRisks: reports the real unavailable reason and returns early when data is unavailable", () => {
  const risks = buildRisks({ freshnessScore: null, dataAvailable: false, unavailableReason: "no key", confidence: 0, persistenceClassification: "UNKNOWN" });
  assert.equal(risks.length, 1);
  assert.match(risks[0], /no key/);
});

test("buildRisks: flags real staleness, single-day coverage, and low confidence when data is available", () => {
  const risks = buildRisks({ freshnessScore: 10, dataAvailable: true, unavailableReason: null, confidence: 30, persistenceClassification: "SINGLE_DAY" });
  assert.equal(risks.length, 3);
});

test("buildRisks: produces an empty list when nothing real is concerning", () => {
  const risks = buildRisks({ freshnessScore: 100, dataAvailable: true, unavailableReason: null, confidence: 90, persistenceClassification: "SUSTAINED" });
  assert.deepEqual(risks, []);
});
