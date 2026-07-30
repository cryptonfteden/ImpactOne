const test = require("node:test");
const assert = require("node:assert/strict");
const { buildOpportunities, buildRisks } = require("./risksOpportunitiesBuilder");

test("buildOpportunities: produces a non-empty real list when conditions are favorable", () => {
  const opportunities = buildOpportunities({ analystBias: "BULLISH", consensusScore: 40, ratingTrend: "IMPROVING", convictionScore: 50, coverageQuality: "HIGH" });
  assert.equal(opportunities.length, 4);
});

test("buildOpportunities: produces an empty list when nothing real is favorable", () => {
  const opportunities = buildOpportunities({ analystBias: "BEARISH", consensusScore: -40, ratingTrend: "DETERIORATING", convictionScore: 10, coverageQuality: "LOW" });
  assert.deepEqual(opportunities, []);
});

test("buildRisks: flags real bearish bias, deteriorating trend, thin coverage, unavailable targets, and low confidence", () => {
  const risks = buildRisks({
    analystBias: "BEARISH",
    consensusScore: -40,
    ratingTrend: "DETERIORATING",
    coverageQuality: "LOW",
    priceTargetsAvailable: false,
    priceTargetUnavailableReason: "403 paid plan required",
    confidence: 30,
  });
  assert.equal(risks.length, 5);
});

test("buildRisks: produces only the permanent price-target risk when everything else is favorable", () => {
  const risks = buildRisks({
    analystBias: "BULLISH",
    consensusScore: 40,
    ratingTrend: "IMPROVING",
    coverageQuality: "HIGH",
    priceTargetsAvailable: false,
    priceTargetUnavailableReason: "403 paid plan required",
    confidence: 80,
  });
  assert.equal(risks.length, 1);
  assert.match(risks[0], /Price targets/);
});
