require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { FORBIDDEN_GOVERNANCE_KEYS, SIGNAL_LABEL, sanitizeSentimentReading, assertNoGovernanceViolation } = require("./marketSentimentGovernance");
const { FORBIDDEN_COMMITTEE_KEYS } = require("../canonicalVerdict");

test("governance field prohibition: reuses canonicalVerdict's exact denylist, not a second competing list", () => {
  assert.deepEqual([...FORBIDDEN_GOVERNANCE_KEYS].sort(), [...FORBIDDEN_COMMITTEE_KEYS].sort());
});

test("governance field prohibition: sanitizeSentimentReading strips every forbidden key structurally", () => {
  const dirty = { market: "US", score: 60, action: "BUY", decision: "STRONG_BUY", verdict: "BULLISH", finalDecision: "BUY_NOW", recommendation: "Buy this" };
  const clean = sanitizeSentimentReading(dirty);
  for (const key of FORBIDDEN_GOVERNANCE_KEYS) {
    assert.equal(key in clean, false, `${key} should have been stripped`);
  }
  assert.equal(clean.market, "US");
  assert.equal(clean.score, 60);
});

test("governance field prohibition: sanitizeSentimentReading always attaches the 'signal, not a recommendation' label", () => {
  const clean = sanitizeSentimentReading({ market: "US" });
  assert.equal(clean.label, SIGNAL_LABEL);
  assert.equal(clean.label, "Signal — not a recommendation");
});

test("governance field prohibition: assertNoGovernanceViolation throws when a forbidden key is present", () => {
  assert.throws(() => assertNoGovernanceViolation({ market: "US", action: "BUY" }), /governance violation/);
});

test("governance field prohibition: assertNoGovernanceViolation does not throw on a clean reading", () => {
  assert.doesNotThrow(() => assertNoGovernanceViolation({ market: "US", score: 60 }));
});

test("governance field prohibition: sanitizeSentimentReading is null/non-object safe", () => {
  assert.equal(sanitizeSentimentReading(null), null);
  assert.equal(sanitizeSentimentReading(undefined), undefined);
});
