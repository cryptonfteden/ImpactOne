const test = require("node:test");
const assert = require("node:assert/strict");
const { buildOpportunities, buildRisks } = require("./risksOpportunitiesBuilder");

function baseInputs(overrides = {}) {
  return {
    etfFlowBias: "NEUTRAL",
    netFlowScore: 0,
    sectorRotation: { classification: "UNKNOWN", relativeStrengthPercent: null },
    flowAcceleration: { classification: "UNKNOWN", accelerationRate: null },
    flowPersistence: { classification: "LOW", persistenceRatio: 0.5, dominantDirection: "INFLOW" },
    isDirectEtf: true,
    barsCount: 60,
    ...overrides,
  };
}

test("buildOpportunities includes a real bullish net-flow clause", () => {
  const opportunities = buildOpportunities(baseInputs({ etfFlowBias: "BULLISH", netFlowScore: 80 }));
  assert.ok(opportunities.some((o) => o.includes("bullish")));
});

test("buildOpportunities includes a real rotating-in clause", () => {
  const opportunities = buildOpportunities(baseInputs({ sectorRotation: { classification: "ROTATING_IN", relativeStrengthPercent: 5 } }));
  assert.ok(opportunities.some((o) => o.includes("rotating into")));
});

test("buildOpportunities includes a real accelerating-bullish clause only when both align", () => {
  const opportunities = buildOpportunities(baseInputs({ etfFlowBias: "BULLISH", flowAcceleration: { classification: "ACCELERATING", accelerationRate: 0.5 } }));
  assert.ok(opportunities.some((o) => o.includes("accelerating")));
});

test("buildOpportunities includes a real high-persistence inflow clause", () => {
  const opportunities = buildOpportunities(baseInputs({ flowPersistence: { classification: "HIGH", persistenceRatio: 0.9, dominantDirection: "INFLOW" } }));
  assert.ok(opportunities.some((o) => o.includes("persistence is high")));
});

test("buildOpportunities returns empty when nothing real is opportunistic", () => {
  assert.deepEqual(buildOpportunities(baseInputs()), []);
});

test("buildRisks includes a real bearish net-flow clause", () => {
  const risks = buildRisks(baseInputs({ etfFlowBias: "BEARISH" }));
  assert.ok(risks.some((r) => r.includes("bearish")));
});

test("buildRisks includes a real rotating-out clause", () => {
  const risks = buildRisks(baseInputs({ sectorRotation: { classification: "ROTATING_OUT", relativeStrengthPercent: -5 } }));
  assert.ok(risks.some((r) => r.includes("rotating out")));
});

test("buildRisks includes a real indirect-proxy disclosure only for a stock (non-direct-ETF) read", () => {
  const direct = buildRisks(baseInputs({ isDirectEtf: true }));
  const indirect = buildRisks(baseInputs({ isDirectEtf: false }));
  assert.ok(!direct.some((r) => r.includes("indirect sector-ETF proxy")));
  assert.ok(indirect.some((r) => r.includes("indirect sector-ETF proxy")));
});

test("buildRisks flags a real limited sample size", () => {
  const risks = buildRisks(baseInputs({ barsCount: 10 }));
  assert.ok(risks.some((r) => r.includes("Limited real price history")));
});

test("buildRisks always discloses the structurally-unavailable fund concentration / stock exposure dimensions", () => {
  const risks = buildRisks(baseInputs());
  assert.ok(risks.some((r) => r.includes("Fund concentration and stock-level ETF exposure")));
});
