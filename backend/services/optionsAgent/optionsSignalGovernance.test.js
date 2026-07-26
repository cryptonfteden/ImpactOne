require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { FORBIDDEN_GOVERNANCE_KEYS, SIGNAL_LABEL, sanitizeOptionsSignal, assertNoGovernanceViolation } = require("./optionsSignalGovernance");
const { FORBIDDEN_COMMITTEE_KEYS } = require("../canonicalVerdict");

test("governance field prohibition: reuses canonicalVerdict's exact denylist, not a second competing list", () => {
  assert.deepEqual([...FORBIDDEN_GOVERNANCE_KEYS].sort(), [...FORBIDDEN_COMMITTEE_KEYS].sort());
});

test("governance field prohibition: sanitizeOptionsSignal strips every forbidden key structurally", () => {
  const dirty = { symbol: "NVDA", anomalyScore: 80, action: "BUY", decision: "STRONG_BUY", verdict: "BULLISH", finalDecision: "BUY_NOW", recommendation: "Buy this" };
  const clean = sanitizeOptionsSignal(dirty);
  for (const key of FORBIDDEN_GOVERNANCE_KEYS) {
    assert.equal(key in clean, false, `${key} should have been stripped`);
  }
  assert.equal(clean.symbol, "NVDA");
  assert.equal(clean.anomalyScore, 80);
});

test("governance field prohibition: sanitizeOptionsSignal always attaches the 'signal, not a recommendation' label", () => {
  const clean = sanitizeOptionsSignal({ symbol: "NVDA" });
  assert.equal(clean.label, SIGNAL_LABEL);
  assert.equal(clean.label, "Signal — not a recommendation");
});

test("governance field prohibition: a signal with no forbidden keys passes through unchanged (besides the label)", () => {
  const clean = sanitizeOptionsSignal({ symbol: "NVDA", anomalyScore: 60 });
  assert.equal(clean.symbol, "NVDA");
  assert.equal(clean.anomalyScore, 60);
});

test("governance field prohibition: assertNoGovernanceViolation throws when a forbidden key is present", () => {
  assert.throws(() => assertNoGovernanceViolation({ symbol: "NVDA", action: "BUY" }), /governance violation/);
});

test("governance field prohibition: assertNoGovernanceViolation does not throw on a clean signal", () => {
  assert.doesNotThrow(() => assertNoGovernanceViolation({ symbol: "NVDA", anomalyScore: 60 }));
});

test("governance field prohibition: sanitizeOptionsSignal is null/non-object safe", () => {
  assert.equal(sanitizeOptionsSignal(null), null);
  assert.equal(sanitizeOptionsSignal(undefined), undefined);
});
