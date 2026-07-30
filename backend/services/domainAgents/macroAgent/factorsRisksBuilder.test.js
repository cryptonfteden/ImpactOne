const test = require("node:test");
const assert = require("node:assert/strict");
const { buildBullishFactors, buildBearishFactors, buildRisks } = require("./factorsRisksBuilder");

function favorableInputs() {
  return {
    yieldCurveResult: { classification: "NORMAL", spread: 0.35 },
    marketStressResult: { marketStress: "LOW", vixLevel: 12 },
    policyDirectionResult: { direction: "EASING", fedFundsChangeYoY: -1 },
    inflationResult: { classification: "LOW", cpiChangeYoY: 1.5 },
    employmentResult: { trend: "IMPROVING", unemploymentChangeYoY: -0.5 },
    liquidityResult: { liquidityScore: 80, m2ChangeYoY: 6 },
  };
}

function unfavorableInputs() {
  return {
    yieldCurveResult: { classification: "INVERTED", spread: -0.4 },
    marketStressResult: { marketStress: "HIGH", vixLevel: 35 },
    policyDirectionResult: { direction: "TIGHTENING", fedFundsChangeYoY: 1 },
    inflationResult: { classification: "ELEVATED", cpiChangeYoY: 7 },
    employmentResult: { trend: "WORSENING", unemploymentChangeYoY: 1.5 },
    liquidityResult: { liquidityScore: 20, m2ChangeYoY: -2 },
  };
}

test("buildBullishFactors: produces a non-empty real factor list when conditions are favorable", () => {
  const factors = buildBullishFactors(favorableInputs());
  assert.ok(factors.length >= 4);
});

test("buildBullishFactors: produces an empty list when conditions are entirely unfavorable", () => {
  const factors = buildBullishFactors(unfavorableInputs());
  assert.deepEqual(factors, []);
});

test("buildBearishFactors: produces a non-empty real factor list when conditions are unfavorable", () => {
  const factors = buildBearishFactors(unfavorableInputs());
  assert.ok(factors.length >= 4);
});

test("buildBearishFactors: produces an empty list when conditions are entirely favorable", () => {
  const factors = buildBearishFactors(favorableInputs());
  assert.deepEqual(factors, []);
});

test("buildRisks: flags real credit stress, recession risk, contraction, and low confidence", () => {
  const risks = buildRisks({
    creditSpreadResult: { classification: "STRESSED", spread: 8 },
    recessionRiskResult: { recessionRisk: "HIGH", recessionRiskScore: 90 },
    economicCycleResult: { cycle: "CONTRACTION", gdpChangeYoY: -1 },
    confidence: { confidence: 40, availableSourceCount: 4, totalSourceCount: 11 },
  });
  assert.equal(risks.length, 4);
});

test("buildRisks: produces an empty list when nothing real is concerning", () => {
  const risks = buildRisks({
    creditSpreadResult: { classification: "TIGHT", spread: 2 },
    recessionRiskResult: { recessionRisk: "LOW", recessionRiskScore: 10 },
    economicCycleResult: { cycle: "EXPANSION", gdpChangeYoY: 3 },
    confidence: { confidence: 100, availableSourceCount: 11, totalSourceCount: 11 },
  });
  assert.deepEqual(risks, []);
});
