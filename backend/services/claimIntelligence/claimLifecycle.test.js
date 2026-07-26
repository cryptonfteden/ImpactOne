require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  computeNextStatusAfterEvidence,
  computeExpiryTransition,
  statusForGradeLabel,
  acceptsNewEvidence,
  isFullyTerminal,
  isPreGradeTerminal,
} = require("./claimLifecycle");
const { MIN_EVIDENCE_BREADTH_FOR_ACTIVE } = require("./claimDimensions");

test("lifecycle: a DRAFT claim stays DRAFT until minimum evidence breadth is real", () => {
  const status = computeNextStatusAfterEvidence({ currentStatus: "DRAFT", evidenceCount: 1 });
  assert.equal(status, "DRAFT");
});

test("lifecycle: a DRAFT claim promotes to ACTIVE once minimum evidence breadth is reached with no strong delta/disagreement", () => {
  const status = computeNextStatusAfterEvidence({ currentStatus: "DRAFT", evidenceCount: MIN_EVIDENCE_BREADTH_FOR_ACTIVE, confidenceDelta: 2, evidenceAgreementPct: 100 });
  assert.equal(status, "ACTIVE");
});

test("lifecycle: strengthening from real new supporting evidence — confidence rose meaningfully", () => {
  const status = computeNextStatusAfterEvidence({ currentStatus: "ACTIVE", evidenceCount: 3, confidenceDelta: 15, evidenceAgreementPct: 90 });
  assert.equal(status, "STRENGTHENING");
});

test("lifecycle: weakening from real counter-evidence — confidence fell meaningfully", () => {
  const status = computeNextStatusAfterEvidence({ currentStatus: "ACTIVE", evidenceCount: 3, confidenceDelta: -15, evidenceAgreementPct: 90 });
  assert.equal(status, "WEAKENING");
});

test("lifecycle: contested when real evidence agreement drops below the threshold, even if confidence itself ticked up", () => {
  const status = computeNextStatusAfterEvidence({ currentStatus: "ACTIVE", evidenceCount: 4, confidenceDelta: 5, evidenceAgreementPct: 40 });
  assert.equal(status, "CONTESTED");
});

test("lifecycle: a real invalidation trigger always wins, regardless of confidence delta or agreement", () => {
  const status = computeNextStatusAfterEvidence({ currentStatus: "STRENGTHENING", evidenceCount: 5, confidenceDelta: 20, evidenceAgreementPct: 95, invalidationTriggered: true });
  assert.equal(status, "INVALIDATED");
});

test("lifecycle: small, insignificant confidence changes keep a claim ACTIVE, never a spurious transition", () => {
  const status = computeNextStatusAfterEvidence({ currentStatus: "ACTIVE", evidenceCount: 3, confidenceDelta: 2, evidenceAgreementPct: 90 });
  assert.equal(status, "ACTIVE");
});

test("lifecycle: a fully-terminal claim never reopens from new evidence", () => {
  for (const terminal of ["RESOLVED_CORRECT", "RESOLVED_PARTIAL", "RESOLVED_INCORRECT", "INSUFFICIENT_DATA"]) {
    const status = computeNextStatusAfterEvidence({ currentStatus: terminal, evidenceCount: 10, confidenceDelta: 50, evidenceAgreementPct: 100 });
    assert.equal(status, terminal, `${terminal} must never reopen`);
  }
});

test("lifecycle: an INVALIDATED/EXPIRED claim never reopens from new evidence either — only grading can move it further", () => {
  assert.equal(computeNextStatusAfterEvidence({ currentStatus: "INVALIDATED", evidenceCount: 5, confidenceDelta: 30 }), "INVALIDATED");
  assert.equal(computeNextStatusAfterEvidence({ currentStatus: "EXPIRED", evidenceCount: 5, confidenceDelta: 30 }), "EXPIRED");
});

test("event expiry: an open claim past its real expiry transitions to EXPIRED", () => {
  const now = new Date("2026-07-27T00:00:00.000Z");
  const status = computeExpiryTransition({ currentStatus: "ACTIVE", expiresAt: new Date("2026-07-26T00:00:00.000Z"), now });
  assert.equal(status, "EXPIRED");
});

test("event expiry: a claim still within its real horizon stays open", () => {
  const now = new Date("2026-07-26T00:00:00.000Z");
  const status = computeExpiryTransition({ currentStatus: "ACTIVE", expiresAt: new Date("2026-07-27T00:00:00.000Z"), now });
  assert.equal(status, "ACTIVE");
});

test("grade label mapping onto the one correct fully-terminal status is total and deterministic", () => {
  assert.equal(statusForGradeLabel("CORRECT"), "RESOLVED_CORRECT");
  assert.equal(statusForGradeLabel("PARTIALLY_CORRECT"), "RESOLVED_PARTIAL");
  assert.equal(statusForGradeLabel("INCORRECT"), "RESOLVED_INCORRECT");
  assert.equal(statusForGradeLabel("UNGRADEABLE"), "INSUFFICIENT_DATA");
});

test("acceptsNewEvidence/isFullyTerminal/isPreGradeTerminal partition the status space correctly", () => {
  assert.equal(acceptsNewEvidence("CONTESTED"), true);
  assert.equal(acceptsNewEvidence("EXPIRED"), false);
  assert.equal(isFullyTerminal("RESOLVED_INCORRECT"), true);
  assert.equal(isFullyTerminal("EXPIRED"), false);
  assert.equal(isPreGradeTerminal("EXPIRED"), true);
  assert.equal(isPreGradeTerminal("ACTIVE"), false);
});

test("lifecycle transitions are deterministic — identical inputs always produce identical output", () => {
  const inputs = { currentStatus: "ACTIVE", evidenceCount: 3, confidenceDelta: 10, evidenceAgreementPct: 80 };
  const a = computeNextStatusAfterEvidence(inputs);
  const b = computeNextStatusAfterEvidence({ ...inputs });
  assert.equal(a, b);
});
