// Phase AI-CORE-001 — Claim Intelligence Layer. The deterministic,
// auditable lifecycle state machine (mission §2). Every transition is a
// pure function of real inputs — no randomness, no hidden state — so the
// exact same inputs always produce the exact same next status, and every
// transition can be replayed/audited from the persisted
// ClaimTransition log.
const { MIN_EVIDENCE_BREADTH_FOR_ACTIVE, STRENGTHENING_DELTA_THRESHOLD, WEAKENING_DELTA_THRESHOLD, CONTESTED_AGREEMENT_THRESHOLD } = require("./claimDimensions");

// Once a claim reaches one of these, it is fully done — no further
// evidence is ever processed into it, and no further transition ever
// fires (grading, once done, is not redone).
const FULLY_TERMINAL_STATUSES = ["RESOLVED_CORRECT", "RESOLVED_PARTIAL", "RESOLVED_INCORRECT", "INSUFFICIENT_DATA"];

// A claim in one of these two ended states no longer accepts new
// evidence, but IS eligible to be graded (moved into a fully-terminal
// status by claimResolutionService) once real outcome data exists.
const PRE_GRADE_TERMINAL_STATUSES = ["INVALIDATED", "EXPIRED"];

// Statuses where new supporting/contradicting evidence is still
// meaningfully processed.
const OPEN_STATUSES = ["DRAFT", "ACTIVE", "STRENGTHENING", "WEAKENING", "CONTESTED"];

function isFullyTerminal(status) {
  return FULLY_TERMINAL_STATUSES.includes(status);
}

function isPreGradeTerminal(status) {
  return PRE_GRADE_TERMINAL_STATUSES.includes(status);
}

function acceptsNewEvidence(status) {
  return OPEN_STATUSES.includes(status);
}

/**
 * The one deterministic transition function for "new evidence arrived."
 * Returns the real next status — never the current status when a real
 * state change is warranted, never a different status when nothing
 * meaningful changed.
 *
 * `invalidationTriggered` (a real, engine-supplied fact — e.g. a price
 * level was actually crossed) always wins over every other input:
 * invalidation is a fact, not a matter of degree.
 */
function computeNextStatusAfterEvidence({ currentStatus, evidenceCount, confidenceDelta = 0, evidenceAgreementPct = null, invalidationTriggered = false }) {
  if (!acceptsNewEvidence(currentStatus)) {
    return currentStatus; // a terminal/pre-grade-terminal claim is never reopened by new evidence
  }

  if (invalidationTriggered) {
    return "INVALIDATED";
  }

  if (currentStatus === "DRAFT" && evidenceCount < MIN_EVIDENCE_BREADTH_FOR_ACTIVE) {
    return "DRAFT"; // never converts a single raw signal directly into unjustified certainty (mission §3)
  }

  // Real, structural disagreement (not merely "confidence dipped a bit")
  // always resolves to CONTESTED, regardless of the confidence delta's
  // sign — a claim can be CONTESTED even while its raw confidence number
  // happens to be rising, if the evidence genuinely disagrees.
  if (Number.isFinite(evidenceAgreementPct) && evidenceAgreementPct < CONTESTED_AGREEMENT_THRESHOLD) {
    return "CONTESTED";
  }

  if (confidenceDelta >= STRENGTHENING_DELTA_THRESHOLD) {
    return "STRENGTHENING";
  }
  if (confidenceDelta <= -WEAKENING_DELTA_THRESHOLD) {
    return "WEAKENING";
  }
  return "ACTIVE";
}

/**
 * Time-based expiry — recomputed, never a value the caller must
 * remember to invalidate. A pre-grade-terminal or fully-terminal claim
 * never "expires" a second time.
 */
function computeExpiryTransition({ currentStatus, expiresAt, now = new Date() }) {
  if (!acceptsNewEvidence(currentStatus)) return currentStatus;
  if (!expiresAt) return currentStatus;
  if (now.getTime() > new Date(expiresAt).getTime()) return "EXPIRED";
  return currentStatus;
}

/**
 * Maps a real ClaimOutcome grade onto the one correct fully-terminal
 * status — a pure, total function (every GradeLabel value maps to
 * exactly one ClaimStatus).
 */
function statusForGradeLabel(gradeLabel) {
  switch (gradeLabel) {
    case "CORRECT":
      return "RESOLVED_CORRECT";
    case "PARTIALLY_CORRECT":
      return "RESOLVED_PARTIAL";
    case "INCORRECT":
      return "RESOLVED_INCORRECT";
    case "UNGRADEABLE":
    default:
      return "INSUFFICIENT_DATA";
  }
}

module.exports = {
  FULLY_TERMINAL_STATUSES,
  PRE_GRADE_TERMINAL_STATUSES,
  OPEN_STATUSES,
  isFullyTerminal,
  isPreGradeTerminal,
  acceptsNewEvidence,
  computeNextStatusAfterEvidence,
  computeExpiryTransition,
  statusForGradeLabel,
};
