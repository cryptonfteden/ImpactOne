require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { FORBIDDEN_GOVERNANCE_KEYS, CLAIM_LABEL, sanitizeClaimView, assertNoGovernanceViolation } = require("./claimGovernance");
const { FORBIDDEN_COMMITTEE_KEYS } = require("../canonicalVerdict");

test("governance field prohibition: reuses canonicalVerdict's exact denylist — the same one enforced by the Committee, Options Agent, Sentiment Engine, and Intelligence Bus", () => {
  assert.deepEqual([...FORBIDDEN_GOVERNANCE_KEYS].sort(), [...FORBIDDEN_COMMITTEE_KEYS].sort());
});

test("governance field prohibition: sanitizeClaimView strips forbidden top-level keys", () => {
  const dirty = { claimId: "c1", confidence: 80, action: "BUY", verdict: "BULLISH" };
  const clean = sanitizeClaimView(dirty);
  assert.equal("action" in clean, false);
  assert.equal("verdict" in clean, false);
  assert.equal(clean.claimId, "c1");
});

test("governance field prohibition: sanitizeClaimView strips forbidden keys from every evidence/counterEvidence entry", () => {
  const dirty = { claimId: "c1", evidence: [{ id: "e1", recommendation: "Buy now" }], counterEvidence: [{ id: "e2", decision: "SELL" }] };
  const clean = sanitizeClaimView(dirty);
  assert.equal("recommendation" in clean.evidence[0], false);
  assert.equal("decision" in clean.counterEvidence[0], false);
  assert.equal(clean.evidence[0].id, "e1");
});

test("governance field prohibition: sanitizeClaimView always attaches the claim label", () => {
  const clean = sanitizeClaimView({ claimId: "c1" });
  assert.equal(clean.label, CLAIM_LABEL);
  assert.match(clean.label, /not a trade instruction/);
});

test("governance field prohibition: assertNoGovernanceViolation throws for a top-level violation, naming the field", () => {
  assert.throws(() => assertNoGovernanceViolation({ action: "BUY" }), /action/);
});

test("governance field prohibition: assertNoGovernanceViolation recurses into arrays (evidence entries)", () => {
  assert.throws(() => assertNoGovernanceViolation([{ verdict: "BULLISH" }]), /verdict/);
});

test("governance field prohibition: assertNoGovernanceViolation does not throw on a clean claim", () => {
  assert.doesNotThrow(() => assertNoGovernanceViolation({ claimId: "c1", confidence: 80, evidence: [{ observedFact: "real" }] }));
});
