const test = require("node:test");
const assert = require("node:assert/strict");
const { buildRiskOpportunity } = require("./riskOpportunity");
const { emptyMetrics } = require("./earningsDataProvider");

function metricsWith(overrides = {}) {
  const base = emptyMetrics("NVDA", null);
  base.dataAvailable = true;
  Object.assign(base.revenue, overrides.revenue);
  Object.assign(base.eps, overrides.eps);
  Object.assign(base.margins, overrides.margins);
  return base;
}

test("no data available => a single, honest 'no data source' risk, no opportunities", () => {
  const result = buildRiskOpportunity({
    metrics: emptyMetrics("NVDA", "not connected"),
    growth: { growthScore: null },
    surprise: { surpriseScore: null },
    consistency: { rating: "UNKNOWN" },
    health: { earningsHealth: "UNKNOWN" },
  });
  assert.equal(result.risks.length, 1);
  assert.match(result.risks[0], /No real earnings data source/);
  assert.deepEqual(result.opportunities, []);
});

test("negative revenue growth is flagged as a real risk with the real percentage", () => {
  const metrics = metricsWith({ revenue: { growthYoY: -12.3 } });
  const result = buildRiskOpportunity({ metrics, growth: {}, surprise: { surpriseScore: 50 }, consistency: { rating: "MODERATE" }, health: { earningsHealth: "STABLE" } });
  assert.ok(result.risks.some((r) => /Revenue declined 12\.3%/.test(r)));
});

test("strong revenue growth is flagged as a real opportunity", () => {
  const metrics = metricsWith({ revenue: { growthYoY: 25 } });
  const result = buildRiskOpportunity({ metrics, growth: {}, surprise: { surpriseScore: 50 }, consistency: { rating: "MODERATE" }, health: { earningsHealth: "STABLE" } });
  assert.ok(result.opportunities.some((o) => /Revenue grew 25\.0%/.test(o)));
});

test("a loss-making net margin is flagged as a real risk", () => {
  const metrics = metricsWith({ margins: { netProfitMargin: -5 } });
  const result = buildRiskOpportunity({ metrics, growth: {}, surprise: { surpriseScore: 50 }, consistency: { rating: "MODERATE" }, health: { earningsHealth: "STABLE" } });
  assert.ok(result.risks.some((r) => /loss-making/.test(r)));
});

test("high historical consistency is flagged as a real opportunity", () => {
  const metrics = metricsWith();
  const result = buildRiskOpportunity({ metrics, growth: {}, surprise: { surpriseScore: 80 }, consistency: { rating: "HIGH", beatRate: 0.9 }, health: { earningsHealth: "STABLE" } });
  assert.ok(result.opportunities.some((o) => /consistency is high/.test(o)));
});

test("low historical consistency is flagged as a real risk", () => {
  const metrics = metricsWith();
  const result = buildRiskOpportunity({ metrics, growth: {}, surprise: { surpriseScore: 20 }, consistency: { rating: "LOW", beatRate: 0.2 }, health: { earningsHealth: "STABLE" } });
  assert.ok(result.risks.some((r) => /consistency is low/.test(r)));
});

test("missing guidance/analyst-revision/cash-flow data sources are always disclosed as real risks (matches OPTIONS-AGENT-001's honesty discipline)", () => {
  const metrics = metricsWith();
  const result = buildRiskOpportunity({ metrics, growth: {}, surprise: { surpriseScore: 50 }, consistency: { rating: "MODERATE" }, health: { earningsHealth: "STABLE" } });
  assert.ok(result.risks.some((r) => /forward-guidance data source/.test(r)));
  assert.ok(result.risks.some((r) => /analyst-revision data source/.test(r)));
  assert.ok(result.risks.some((r) => /cash-flow data source/.test(r)));
});

test("STRONG earnings health is flagged as a real opportunity, WEAK as a real risk", () => {
  const metrics = metricsWith();
  const strong = buildRiskOpportunity({ metrics, growth: {}, surprise: { surpriseScore: 50 }, consistency: { rating: "MODERATE" }, health: { earningsHealth: "STRONG" } });
  const weak = buildRiskOpportunity({ metrics, growth: {}, surprise: { surpriseScore: 50 }, consistency: { rating: "MODERATE" }, health: { earningsHealth: "WEAK" } });
  assert.ok(strong.opportunities.some((o) => /STRONG/.test(o)));
  assert.ok(weak.risks.some((r) => /WEAK/.test(r)));
});

test("both lists always have at least one entry — never an empty array when data is available", () => {
  const metrics = metricsWith();
  const result = buildRiskOpportunity({ metrics, growth: {}, surprise: { surpriseScore: 50 }, consistency: { rating: "MODERATE" }, health: { earningsHealth: "STABLE" } });
  assert.ok(result.risks.length >= 1);
  assert.ok(result.opportunities.length >= 1);
});
