require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { FORBIDDEN_GOVERNANCE_KEYS, SIGNAL_LABEL, sanitizeEvent, assertNoGovernanceViolation } = require("./intelligenceBusGovernance");
const { FORBIDDEN_COMMITTEE_KEYS } = require("../canonicalVerdict");

test("governance field prohibition: reuses canonicalVerdict's exact denylist, not a fourth competing list", () => {
  assert.deepEqual([...FORBIDDEN_GOVERNANCE_KEYS].sort(), [...FORBIDDEN_COMMITTEE_KEYS].sort());
});

test("governance field prohibition: sanitizeEvent strips forbidden keys from the top-level event", () => {
  const dirty = { engineId: "options", score: 80, action: "BUY", verdict: "BULLISH" };
  const clean = sanitizeEvent(dirty);
  assert.equal("action" in clean, false);
  assert.equal("verdict" in clean, false);
  assert.equal(clean.engineId, "options");
});

test("governance field prohibition: sanitizeEvent also strips forbidden keys nested inside payload — the one place a leaking engine's own verdict would hide", () => {
  const dirty = { engineId: "sentiment", payload: { score: 60, recommendation: "Buy NVDA now", decision: "STRONG_BUY" } };
  const clean = sanitizeEvent(dirty);
  assert.equal("recommendation" in clean.payload, false);
  assert.equal("decision" in clean.payload, false);
  assert.equal(clean.payload.score, 60);
});

test("governance field prohibition: sanitizeEvent always attaches the 'signal, not a recommendation' label", () => {
  const clean = sanitizeEvent({ engineId: "options" });
  assert.equal(clean.label, SIGNAL_LABEL);
  assert.equal(clean.label, "Signal — not a recommendation");
});

test("governance field prohibition: assertNoGovernanceViolation throws for a top-level violation", () => {
  assert.throws(() => assertNoGovernanceViolation({ engineId: "options", action: "BUY" }), /governance violation/);
});

test("governance field prohibition: assertNoGovernanceViolation throws for a payload-nested violation, naming the nested path", () => {
  assert.throws(() => assertNoGovernanceViolation({ engineId: "options", payload: { verdict: "BULLISH" } }), /payload\.verdict/);
});

test("governance field prohibition: assertNoGovernanceViolation does not throw on a clean event", () => {
  assert.doesNotThrow(() => assertNoGovernanceViolation({ engineId: "options", payload: { score: 80 } }));
});
