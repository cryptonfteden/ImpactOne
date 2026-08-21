const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeDirection, summarizeCommittee } = require("./committeeDecisionModel");

function row(agentId, direction, confidence = 80, signalEligible = true) {
  return { agentId, status: "fulfilled", direction, confidence, result: { raw: { dataAvailable: true, signalEligible } } };
}

test("normalizes domain vocabulary and keeps missing direction distinct from neutral", () => {
  assert.equal(normalizeDirection("UNDERVALUED"), "BULLISH");
  assert.equal(normalizeDirection("OVERVALUED"), "BEARISH");
  assert.equal(normalizeDirection("HOLD"), "NEUTRAL");
  assert.equal(normalizeDirection(null), "NONE");
});

test("correlated news agents count as one independent family", () => {
  const summary = summarizeCommittee([
    row("news", "BULLISH", 90),
    row("symbol-sentiment", "BULLISH", 90),
  ]);
  assert.deepEqual(summary.independentBullishFamilies, ["catalysts"]);
  assert.equal(summary.families[0].evidenceWeight, 8);
});

test("an agent with no direction covers evidence but never casts a neutral vote", () => {
  const summary = summarizeCommittee([row("options", null, 90)]);
  assert.equal(summary.directionalAgentCount, 0);
  assert.equal(summary.families[0].direction, "NONE");
  assert.equal(summary.direction, "NEUTRAL");
  assert.equal(summary.conviction, 0);
});

test("explicitly ineligible evidence does not affect direction or coverage", () => {
  const summary = summarizeCommittee([
    row("insider", "BULLISH", 99, false),
    row("earnings", "BEARISH", 80, true),
  ]);
  assert.equal(summary.direction, "BEARISH");
  assert.deepEqual(summary.independentBullishFamilies, []);
  // Earnings contributes its configured 7 points into a 20-point
  // fundamentals+ownership evidence universe. The rejected insider row adds 0.
  assert.equal(summary.coveragePct, 35);
});

test("strong bearish ownership or fundamentals creates a strategic veto", () => {
  const summary = summarizeCommittee([
    row("institutional", "BEARISH", 90),
    row("news", "BULLISH", 95),
    row("symbol-sentiment", "BULLISH", 95),
  ]);
  assert.deepEqual(summary.vetoFamilies, ["ownership"]);
});
