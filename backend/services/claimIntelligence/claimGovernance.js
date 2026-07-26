// Phase AI-CORE-001 — Claim Intelligence Layer. Governance (mission §8):
// "A Claim is not automatically a trade recommendation." Reuses
// canonicalVerdict.js's exact FORBIDDEN_COMMITTEE_KEYS denylist — the
// same one the Committee, the Options Agent, the Sentiment Engine, and
// the Intelligence Bus already each independently enforce. This is the
// 4th reuse of the same list, by design: one governance vocabulary for
// the whole platform, never a competing one per layer.
const { FORBIDDEN_COMMITTEE_KEYS } = require("../canonicalVerdict");

const FORBIDDEN_GOVERNANCE_KEYS = [...FORBIDDEN_COMMITTEE_KEYS];

const CLAIM_LABEL = "Claim — evidence and forecast, not a trade instruction";

/**
 * Strips forbidden keys from the top level of a claim view AND from
 * every evidence entry's own fields (the one place an integrated
 * engine's own output could carry a stray verdict-shaped field) —
 * applied both at formation time (a hard, throwing assertion — a
 * violating claim/evidence entry is never even persisted) and at every
 * read (a silent strip, defense in depth), same two-layer discipline the
 * Intelligence Bus already established.
 */
function sanitizeClaimView(claimView) {
  if (!claimView || typeof claimView !== "object") return claimView;
  const sanitized = { ...claimView };
  for (const key of FORBIDDEN_GOVERNANCE_KEYS) {
    delete sanitized[key];
  }
  if (Array.isArray(sanitized.evidence)) {
    sanitized.evidence = sanitized.evidence.map((entry) => stripForbiddenKeys(entry));
  }
  if (Array.isArray(sanitized.counterEvidence)) {
    sanitized.counterEvidence = sanitized.counterEvidence.map((entry) => stripForbiddenKeys(entry));
  }
  sanitized.label = CLAIM_LABEL;
  return sanitized;
}

function stripForbiddenKeys(entry) {
  if (!entry || typeof entry !== "object") return entry;
  const clean = { ...entry };
  for (const key of FORBIDDEN_GOVERNANCE_KEYS) {
    delete clean[key];
  }
  return clean;
}

function assertNoGovernanceViolation(value, path = "") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoGovernanceViolation(item, `${path}[${index}]`));
    return;
  }
  const present = FORBIDDEN_GOVERNANCE_KEYS.filter((key) => key in value);
  if (present.length) {
    const location = path ? `${path}.` : "";
    throw new Error(`Claim governance violation — forbidden field(s) present at "${location}${present.join(", ")}"`.trim() + `. A Claim may never carry an action/decision/verdict/recommendation field.`);
  }
}

module.exports = { FORBIDDEN_GOVERNANCE_KEYS, CLAIM_LABEL, sanitizeClaimView, assertNoGovernanceViolation };
