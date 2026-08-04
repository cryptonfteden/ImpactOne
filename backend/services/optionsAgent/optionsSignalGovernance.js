// Phase AI-ENGINE-001.1 — Unusual Options Agent foundation. Governance
// per OPTIONS_AGENT_ARCHITECTURE.md §8: "signal, never a verdict." This
// module is the structural guard, independent of what the detectors
// happen to compute — the same defensive discipline canonicalVerdict.js's
// FORBIDDEN_COMMITTEE_KEYS already applies to the Committee.
const { FORBIDDEN_COMMITTEE_KEYS } = require("../canonicalVerdict");

// Same denylist canonicalVerdict.js enforces for the Committee, reused
// verbatim rather than a second, competing list (architecture §8 is
// explicit: "bound by the same rule").
const FORBIDDEN_GOVERNANCE_KEYS = [...FORBIDDEN_COMMITTEE_KEYS];

const SIGNAL_LABEL = "Signal — not a recommendation";

/**
 * Strips any forbidden governance key from a signal object before it is
 * ever persisted or returned from an API — structural, not dependent on
 * detector code never accidentally computing one.
 */
function sanitizeOptionsSignal(signal) {
  if (!signal || typeof signal !== "object") return signal;
  const sanitized = { ...signal };
  for (const key of FORBIDDEN_GOVERNANCE_KEYS) {
    delete sanitized[key];
  }
  sanitized.label = SIGNAL_LABEL;
  return sanitized;
}

/**
 * A hard, throwing assertion (distinct from the silent-strip
 * sanitizeOptionsSignal above) — for internal invariant checks/tests
 * that want to prove a forbidden key was never present in the first
 * place, not just that it would have been removed.
 */
function assertNoGovernanceViolation(signal) {
  if (!signal || typeof signal !== "object") return;
  const present = FORBIDDEN_GOVERNANCE_KEYS.filter((key) => key in signal);
  if (present.length) {
    throw new Error(`OptionsSignal governance violation — forbidden field(s) present: ${present.join(", ")}. An options signal must never emit an action/decision/verdict/recommendation field.`);
  }
}

module.exports = {
  FORBIDDEN_GOVERNANCE_KEYS,
  SIGNAL_LABEL,
  sanitizeOptionsSignal,
  assertNoGovernanceViolation,
};
