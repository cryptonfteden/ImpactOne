const test = require("node:test");
const assert = require("node:assert/strict");
const { buildOpportunities, buildRisks } = require("./risksOpportunitiesBuilder");

function baseInputs(overrides = {}) {
  return {
    shortInterestBias: "NEUTRAL",
    shortInterestScore: 0,
    squeezeProbability: 0,
    coveringActivity: { classification: "LOW", decliningDayRatio: 0 },
    crowdednessScore: 0,
    borrowStress: { unavailableReason: "No real securities-lending data source is connected." },
    daysCount: 15,
    lookbackTradingDays: 15,
    ...overrides,
  };
}

test("buildOpportunities includes a real bullish-bias clause", () => {
  const opportunities = buildOpportunities(baseInputs({ shortInterestBias: "BULLISH", shortInterestScore: 40 }));
  assert.ok(opportunities.some((o) => o.includes("bullish")));
});

test("buildOpportunities includes a real elevated-squeeze-probability clause", () => {
  const opportunities = buildOpportunities(baseInputs({ squeezeProbability: 85 }));
  assert.ok(opportunities.some((o) => o.includes("Squeeze probability is elevated")));
});

test("buildOpportunities includes a real high-covering-activity clause", () => {
  const opportunities = buildOpportunities(baseInputs({ coveringActivity: { classification: "HIGH", decliningDayRatio: 0.9 } }));
  assert.ok(opportunities.some((o) => o.includes("covering activity is high")));
});

test("buildOpportunities includes a real high-crowdedness clause only when bias isn't bearish", () => {
  const opportunities = buildOpportunities(baseInputs({ crowdednessScore: 80, shortInterestBias: "NEUTRAL" }));
  assert.ok(opportunities.some((o) => o.includes("Crowdedness score is high")));
  const bearishOpportunities = buildOpportunities(baseInputs({ crowdednessScore: 80, shortInterestBias: "BEARISH" }));
  assert.ok(!bearishOpportunities.some((o) => o.includes("Crowdedness score is high")));
});

test("buildOpportunities returns empty when nothing real is opportunistic", () => {
  assert.deepEqual(buildOpportunities(baseInputs()), []);
});

test("buildRisks includes a real bearish-bias clause", () => {
  const risks = buildRisks(baseInputs({ shortInterestBias: "BEARISH" }));
  assert.ok(risks.some((r) => r.includes("bearish")));
});

test("buildRisks flags real incomplete sample coverage", () => {
  const risks = buildRisks(baseInputs({ daysCount: 5, lookbackTradingDays: 15 }));
  assert.ok(risks.some((r) => r.includes("Only 5 of the intended 15")));
});

test("buildRisks always discloses the real borrow-stress unavailability", () => {
  const risks = buildRisks(baseInputs());
  assert.ok(risks.some((r) => r.includes("No real securities-lending data source is connected.")));
});

test("buildRisks always discloses the real short-volume-vs-short-interest proxy distinction", () => {
  const risks = buildRisks(baseInputs());
  assert.ok(risks.some((r) => r.includes("disclosed proxy")));
});
