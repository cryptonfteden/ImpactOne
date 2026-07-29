const test = require("node:test");
const assert = require("node:assert/strict");
const { detectConflicts } = require("./conflictDetector");

function agent(agentId, available, direction) {
  return { agentId, available, direction };
}

test("no conflicts when all available agents agree", () => {
  const conflicts = detectConflicts([agent("options", true, "BULLISH"), agent("earnings", true, "BULLISH"), agent("valuation", true, "BULLISH")]);
  assert.deepEqual(conflicts, []);
});

test("a real conflict is detected between two disagreeing available agents", () => {
  const conflicts = detectConflicts([agent("options", true, "BULLISH"), agent("earnings", true, "BEARISH")]);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].agentA, "options");
  assert.equal(conflicts[0].agentB, "earnings");
});

test("a NEUTRAL agent never conflicts with anything — it has no real lean to disagree with", () => {
  const conflicts = detectConflicts([agent("options", true, "BULLISH"), agent("valuation", true, "NEUTRAL")]);
  assert.deepEqual(conflicts, []);
});

test("an unavailable agent is never considered for conflict detection, even if it somehow carries a stale direction value", () => {
  const conflicts = detectConflicts([agent("options", true, "BULLISH"), agent("earnings", false, "BEARISH")]);
  assert.deepEqual(conflicts, []);
});

test("2-vs-1 disagreement produces exactly the 2 real disagreeing pairs, and never flags the agreeing pair", () => {
  const conflicts = detectConflicts([agent("options", true, "BULLISH"), agent("earnings", true, "BEARISH"), agent("valuation", true, "BULLISH")]);
  assert.equal(conflicts.length, 2, "options-vs-earnings and earnings-vs-valuation disagree; options-vs-valuation agree and must not appear");
  const pairs = conflicts.map((c) => [c.agentA, c.agentB].sort().join("-"));
  assert.ok(pairs.includes(["earnings", "options"].sort().join("-")));
  assert.ok(pairs.includes(["earnings", "valuation"].sort().join("-")));
  assert.ok(!pairs.includes(["options", "valuation"].sort().join("-")));
});
