require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../../test/dbHelpers");
const autonomousRecommendationRepository = require("../autonomousRecommendationRepository");
const learningFieldAuditService = require("./learningFieldAuditService");

function recommendationData(overrides = {}) {
  return {
    symbol: "NVDA",
    action: "BUY",
    confidenceScore: 80,
    expectedUpside: "10-15%",
    expectedDownside: "-6%",
    riskScore: 30,
    riskLabel: "Low",
    positionSizeSuggestion: "2-4%",
    reasoning: "Test reasoning.",
    evidence: { currentPrice: 100 },
    portfolioContext: null,
    timeHorizon: "1-3 months",
    explanation: {},
    scenarios: [],
    qualityScore: 75,
    qualityComponents: {},
    ...overrides,
  };
}

test.beforeEach(async () => {
  await truncateAll();
});

test("auditLearningFields covers every field named in the Learning Data Contract, each with a documented classification", async () => {
  const audit = await learningFieldAuditService.auditLearningFields();
  const fieldNames = audit.fields.map((entry) => entry.field);
  for (const required of ["Recommendation ID", "DecisionTrace ID", "Asset (symbol)", "Asset class", "Sector", "Market regime", "Time window", "Entry price", "Exit price", "Benchmark", "Benchmark return", "Absolute return", "Alpha", "Committee votes", "CIO decision", "Evidence categories", "Provider snapshot", "Data freshness", "Outcome", "Lifecycle state"]) {
    assert.ok(fieldNames.includes(required), `${required} must be audited`);
  }
  for (const entry of audit.fields) {
    assert.ok(["MISSING", "NULLABLE", "DERIVED", "IMPOSSIBLE", "LEGACY"].includes(entry.classification), `${entry.field} has an invalid classification`);
  }
});

test("auditLearningFields reports a real, computed sector-presence rate — not a fabricated number", async () => {
  await autonomousRecommendationRepository.createRecommendation(recommendationData({ portfolioContext: { sector: "Technology", quantity: 1, marketValue: 100, unrealizedPnlPct: 0, weightPct: 1 } }));
  await autonomousRecommendationRepository.createRecommendation(recommendationData({ portfolioContext: null }));

  const audit = await learningFieldAuditService.auditLearningFields();
  const sectorField = audit.fields.find((entry) => entry.field === "Sector");
  assert.equal(sectorField.presencePct, 50, "1 of 2 recommendations has a real sector — exactly 50%, hand-computed");
});

test("auditLearningFields honestly reports null presence for an empty dataset, never a fabricated percentage", async () => {
  const audit = await learningFieldAuditService.auditLearningFields();
  const sectorField = audit.fields.find((entry) => entry.field === "Sector");
  assert.equal(sectorField.presencePct, null);
});
