require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const opportunityScoreService = require("./opportunityScoreService");

test("computeOpportunityScore returns a 0-100 score with a per-factor explanation when all real inputs are present", () => {
  const result = opportunityScoreService.computeOpportunityScore({
    symbol: "NVDA",
    momentumPct: 8,
    relativeVolume: 2.2,
    avgDailyDollarVolume: 500_000_000,
    marketCap: 1_200_000_000_000,
    newsCount: 4,
    aiQualityScore: 82,
  });

  assert.ok(Number.isInteger(result.score));
  assert.ok(result.score >= 0 && result.score <= 100);
  assert.equal(result.explanation.length, 6);
  for (const factor of result.explanation) {
    assert.equal(factor.available, true);
    assert.notEqual(factor.realValue, null);
  }
});

test("never fabricates a missing factor — excluded from the explanation's contribution, not zero-filled", () => {
  const result = opportunityScoreService.computeOpportunityScore({
    symbol: "THIN",
    momentumPct: 5,
    relativeVolume: null, // genuinely unavailable this call
    avgDailyDollarVolume: null,
    marketCap: 50_000_000_000,
    newsCount: null,
    aiQualityScore: null,
  });

  const relativeVolumeFactor = result.explanation.find((entry) => entry.factor === "relativeVolume");
  assert.equal(relativeVolumeFactor.available, false);
  assert.equal(relativeVolumeFactor.realValue, null);
  assert.equal(relativeVolumeFactor.normalizedContribution, null);

  // Score still computes from whatever real factors ARE available
  // (momentum, marketCap here), never falls back to a fabricated default.
  assert.ok(Number.isInteger(result.score));
});

test("returns a null score, never a fabricated number, when zero real factors are available", () => {
  const result = opportunityScoreService.computeOpportunityScore({
    symbol: "NODATA",
    momentumPct: null,
    relativeVolume: null,
    avgDailyDollarVolume: null,
    marketCap: null,
    newsCount: null,
    aiQualityScore: null,
  });
  assert.equal(result.score, null);
});

test("always discloses shortInterest/longInterest as unavailable inputs, regardless of what real data is available", () => {
  const result = opportunityScoreService.computeOpportunityScore({ symbol: "X", momentumPct: 1 });
  const names = result.unavailableInputs.map((entry) => entry.factor).sort();
  assert.deepEqual(names, ["longInterest", "shortInterest"]);
});

test("every explanation factor's weight matches the exposed CONFIG.WEIGHTS constant", () => {
  const result = opportunityScoreService.computeOpportunityScore({ symbol: "X", momentumPct: 1 });
  for (const factor of result.explanation) {
    assert.equal(factor.weight, opportunityScoreService.CONFIG.WEIGHTS[factor.factor]);
  }
});
