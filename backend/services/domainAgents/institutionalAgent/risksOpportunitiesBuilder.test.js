const test = require("node:test");
const assert = require("node:assert/strict");
const { buildOpportunities, buildRisks } = require("./risksOpportunitiesBuilder");

function baseInputs(overrides = {}) {
  return {
    institutionalBias: "NEUTRAL",
    institutionalScore: 0,
    accumulationDistribution: { accumulationScore: 0, distributionScore: 0, totalIncreaseValue: 0, totalDecreaseValue: 0 },
    newClosedPositions: { newPositions: [], closedPositions: [] },
    convictionAnalysis: { convictionScore: 0, participationRate: 0 },
    checkedCount: 7,
    totalManagers: 7,
    ...overrides,
  };
}

test("buildOpportunities includes a real bullish-bias clause", () => {
  const opportunities = buildOpportunities(baseInputs({ institutionalBias: "BULLISH", institutionalScore: 50 }));
  assert.ok(opportunities.some((o) => o.includes("bullish")));
});

test("buildOpportunities includes a real accumulation-outweighs-distribution clause", () => {
  const opportunities = buildOpportunities(baseInputs({ accumulationDistribution: { accumulationScore: 80, distributionScore: 20, totalIncreaseValue: 800, totalDecreaseValue: 200 } }));
  assert.ok(opportunities.some((o) => o.includes("Real accumulation")));
});

test("buildOpportunities includes a real net-new-positions clause", () => {
  const opportunities = buildOpportunities(baseInputs({ newClosedPositions: { newPositions: [{}, {}], closedPositions: [{}] } }));
  assert.ok(opportunities.some((o) => o.includes("2 real new institutional position")));
});

test("buildOpportunities includes a real high-conviction-bullish clause only when both align", () => {
  const opportunities = buildOpportunities(baseInputs({ institutionalBias: "BULLISH", convictionAnalysis: { convictionScore: 90, participationRate: 50 } }));
  assert.ok(opportunities.some((o) => o.includes("conviction is high")));
});

test("buildOpportunities returns empty when nothing real is opportunistic", () => {
  assert.deepEqual(buildOpportunities(baseInputs()), []);
});

test("buildRisks includes a real bearish-bias clause", () => {
  const risks = buildRisks(baseInputs({ institutionalBias: "BEARISH" }));
  assert.ok(risks.some((r) => r.includes("bearish")));
});

test("buildRisks includes a real distribution-outweighs-accumulation clause", () => {
  const risks = buildRisks(baseInputs({ accumulationDistribution: { accumulationScore: 20, distributionScore: 80, totalIncreaseValue: 200, totalDecreaseValue: 800 } }));
  assert.ok(risks.some((r) => r.includes("Real distribution")));
});

test("buildRisks includes a real net-closed-positions clause", () => {
  const risks = buildRisks(baseInputs({ newClosedPositions: { newPositions: [], closedPositions: [{}, {}] } }));
  assert.ok(risks.some((r) => r.includes("2 real institutional position(s) closed")));
});

test("buildRisks flags real incomplete coverage when fewer than the full disclosed cohort was checked", () => {
  const risks = buildRisks(baseInputs({ checkedCount: 4, totalManagers: 7 }));
  assert.ok(risks.some((r) => r.includes("Only 4 of 7")));
});

test("buildRisks always discloses the curated-cohort scope limitation", () => {
  const risks = buildRisks(baseInputs());
  assert.ok(risks.some((r) => r.includes("disclosed cohort of 7 major real institutional managers")));
});
