require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { rankFeedForInvestor } = require("./feedPersonalizationService");

function event(overrides = {}) {
  return {
    headline: "Event",
    whyItMatters: "Short reason.",
    impactType: "neutral",
    riskLevel: "low",
    timeHorizon: "1-3 months",
    ...overrides,
  };
}

test("returns the feed unchanged when no investor profile is provided", () => {
  const feed = [event({ headline: "A" }), event({ headline: "B" })];
  const result = rankFeedForInvestor(feed, {});
  assert.deepEqual(result, feed);
});

test("never mutates impactType, riskLevel, or any other fact on an event", () => {
  const feed = [event({ headline: "A", impactType: "risk" })];
  const result = rankFeedForInvestor(feed, { investorProfile: { riskTolerance: "HIGH" } });
  assert.equal(result[0].impactType, "risk");
  assert.equal(result[0].headline, "A");
});

test("a high risk tolerance ranks opportunity events above otherwise-equal neutral events", () => {
  const opportunity = event({ headline: "Opportunity", impactType: "opportunity" });
  const neutral = event({ headline: "Neutral", impactType: "neutral" });
  const result = rankFeedForInvestor([neutral, opportunity], { investorProfile: { riskTolerance: "HIGH" } });
  assert.equal(result[0].headline, "Opportunity");
});

test("a low risk tolerance ranks risk events above otherwise-equal neutral events (protective, not suppressive)", () => {
  const risk = event({ headline: "Risk", impactType: "risk" });
  const neutral = event({ headline: "Neutral", impactType: "neutral" });
  const result = rankFeedForInvestor([neutral, risk], { investorProfile: { riskTolerance: "LOW" } });
  assert.equal(result[0].headline, "Risk");
});

test("a short investment horizon ranks near-term events above long-term ones", () => {
  const nearTerm = event({ headline: "This week", timeHorizon: "2-6 weeks" });
  const longTerm = event({ headline: "Next year", timeHorizon: "6-12 months" });
  const result = rankFeedForInvestor([longTerm, nearTerm], { investorProfile: { investmentHorizon: "SHORT_TERM" } });
  assert.equal(result[0].headline, "This week");
});

test("a younger age boosts opportunity-framed events; near-retirement age boosts risk-framed events", () => {
  const opportunity = event({ headline: "Opportunity", impactType: "opportunity" });
  const risk = event({ headline: "Risk", impactType: "risk" });

  const young = rankFeedForInvestor([risk, opportunity], { investorProfile: { age: 22 } });
  assert.equal(young[0].headline, "Opportunity");

  const older = rankFeedForInvestor([opportunity, risk], { investorProfile: { age: 62 } });
  assert.equal(older[0].headline, "Risk");
});

test("a LEARNING goal boosts events with a longer explanatory whyItMatters", () => {
  const detailed = event({ headline: "Detailed", whyItMatters: "A".repeat(200) });
  const brief = event({ headline: "Brief", whyItMatters: "Short." });
  const result = rankFeedForInvestor([brief, detailed], { investorProfile: { investmentGoal: "LEARNING" } });
  assert.equal(result[0].headline, "Detailed");
});

test("does not fabricate a boost for a goal with no honest signal available (PASSIVE_INCOME)", () => {
  const feed = [event({ headline: "A" }), event({ headline: "B" })];
  const result = rankFeedForInvestor(feed, { investorProfile: { investmentGoal: "PASSIVE_INCOME" } });
  assert.deepEqual(result.map((item) => item.headline), ["A", "B"]);
});

test("preserves the original relative order among events with equal profile weight (stable sort)", () => {
  const feed = [event({ headline: "First" }), event({ headline: "Second" }), event({ headline: "Third" })];
  const result = rankFeedForInvestor(feed, { investorProfile: { riskTolerance: "MEDIUM" } });
  assert.deepEqual(result.map((item) => item.headline), ["First", "Second", "Third"]);
});
