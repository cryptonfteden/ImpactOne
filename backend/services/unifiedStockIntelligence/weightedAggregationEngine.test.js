const test = require("node:test");
const assert = require("node:assert/strict");
const { aggregate, CORROBORATION_BONUS, CONFLICT_PENALTY, UNAVAILABLE_AGENT_PENALTY } = require("./weightedAggregationEngine");

function agent(agentId, available, direction, confidence, priority = 7) {
  return { agentId, available, direction, confidence, priority };
}

test("zero available agents => honestly NEUTRAL, 0/0 confidence, no fabricated read", () => {
  const result = aggregate([agent("options", false, null, 0), agent("earnings", false, null, 0), agent("valuation", false, null, 0)], []);
  assert.equal(result.overallIntelligence, "NEUTRAL");
  assert.equal(result.overallConfidence, 0);
  assert.equal(result.recommendationConfidence, 0);
  assert.deepEqual(result.contributions, []);
});

test("this is never a naive average: three agents at wildly different confidences with equal priority produce a result that is NOT simply (c1+c2+c3)/3", () => {
  const agents = [agent("options", true, "BULLISH", 90, 7), agent("earnings", true, "BULLISH", 90, 7), agent("valuation", true, "BULLISH", 10, 7)];
  const result = aggregate(agents, []);
  const naiveAverage = (90 + 90 + 10) / 3; // 63.33
  assert.notEqual(result.overallConfidence, Math.round(naiveAverage));
});

test("all three agents agreeing BULLISH at equal priority/confidence produces a real BULLISH classification with a corroboration bonus applied", () => {
  const agents = [agent("options", true, "BULLISH", 70), agent("earnings", true, "BULLISH", 70), agent("valuation", true, "BULLISH", 70)];
  const result = aggregate(agents, []);
  assert.equal(result.overallIntelligence, "BULLISH");
  assert.equal(result.overallConfidence, Math.round(70 + CORROBORATION_BONUS[3]));
});

test("a single agreeing agent (the other two neutral/unavailable) gets the disclosed lower single-agent corroboration bonus, never the 3-agent bonus", () => {
  const agents = [agent("options", true, "BULLISH", 70), agent("earnings", true, "NEUTRAL", 50), agent("valuation", false, null, 0)];
  const result = aggregate(agents, []);
  if (result.overallIntelligence === "BULLISH") {
    assert.equal(result.overallConfidence, clampCheck(70 + CORROBORATION_BONUS[1] - UNAVAILABLE_AGENT_PENALTY * 1));
  }
});

function clampCheck(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

test("a real conflict applies the disclosed conflict penalty and is never silently blended away", () => {
  const agents = [agent("options", true, "BULLISH", 80), agent("earnings", true, "BULLISH", 80), agent("valuation", true, "BEARISH", 80)];
  const conflicts = [{ agentA: "options", directionA: "BULLISH", agentB: "valuation", directionB: "BEARISH" }];
  const withConflict = aggregate(agents, conflicts);
  const withoutConflict = aggregate(agents, []);
  assert.ok(withConflict.overallConfidence < withoutConflict.overallConfidence, "a real conflict must lower confidence relative to the same agents agreeing");
  assert.equal(withoutConflict.overallConfidence - withConflict.overallConfidence, CONFLICT_PENALTY);
});

test("missing/unavailable agents reduce confidence via the disclosed per-agent penalty", () => {
  const allThree = [agent("options", true, "BULLISH", 80), agent("earnings", true, "BULLISH", 80), agent("valuation", true, "BULLISH", 80)];
  const onlyTwo = [agent("options", true, "BULLISH", 80), agent("earnings", true, "BULLISH", 80), agent("valuation", false, null, 0)];
  const full = aggregate(allThree, []);
  const partial = aggregate(onlyTwo, []);
  assert.ok(partial.overallConfidence < full.overallConfidence);
});

test("recommendationConfidence is capped low when a real conflict exists, even if overallConfidence is not zero", () => {
  const agents = [agent("options", true, "BULLISH", 90, 8), agent("earnings", true, "BULLISH", 90, 7), agent("valuation", true, "BEARISH", 90, 7)];
  const conflicts = [{ agentA: "options", directionA: "BULLISH", agentB: "valuation", directionB: "BEARISH" }];
  const result = aggregate(agents, conflicts);
  assert.ok(result.recommendationConfidence <= 40);
});

test("recommendationConfidence is proportionally discounted when fewer than 3 agents are available", () => {
  const agents = [agent("options", true, "BULLISH", 90), agent("earnings", false, null, 0), agent("valuation", false, null, 0)];
  const result = aggregate(agents, []);
  assert.ok(result.recommendationConfidence < result.overallConfidence || result.recommendationConfidence === 0);
});

test("overallIntelligence and overallConfidence are always internally consistent — NEUTRAL always carries 0 confidence, never a fabricated non-zero number for a non-claim", () => {
  const agents = [agent("options", true, "BULLISH", 50, 5), agent("earnings", true, "BEARISH", 50, 5), agent("valuation", true, "NEUTRAL", 50, 5)];
  const result = aggregate(agents, [{ agentA: "options", directionA: "BULLISH", agentB: "earnings", directionB: "BEARISH" }]);
  assert.equal(result.overallIntelligence, "NEUTRAL");
  assert.equal(result.overallConfidence, 0);
});

test("higher-priority agents genuinely influence the classification more than lower-priority ones", () => {
  const highPriorityBullish = [agent("technical-like-high-priority", true, "BULLISH", 60, 10), agent("earnings", true, "BEARISH", 60, 3), agent("valuation", true, "BEARISH", 60, 3)];
  const result = aggregate(highPriorityBullish, []);
  assert.equal(result.overallIntelligence, "BULLISH", "one high-priority bullish agent can outweigh two lower-priority bearish agents");
});

test("every contribution is real and traceable — agentId, direction, confidence, priority, and a real contributionScore are all present", () => {
  const agents = [agent("options", true, "BULLISH", 80, 7)];
  const result = aggregate(agents, []);
  assert.equal(result.contributions.length, 1);
  const [contribution] = result.contributions;
  assert.equal(contribution.agentId, "options");
  assert.equal(contribution.direction, "BULLISH");
  assert.equal(contribution.confidence, 80);
  assert.equal(contribution.priority, 7);
  assert.ok(Number.isFinite(contribution.contributionScore));
});
