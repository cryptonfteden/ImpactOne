// Phase AI-ENGINE-002.1 — Market Sentiment Engine foundation. Governance
// per mission §6 / MARKET_SENTIMENT_ENGINE.md §11: "sentiment, never a
// verdict." Reuses canonicalVerdict.js's exact FORBIDDEN_COMMITTEE_KEYS
// denylist — the same structural guard the Options Agent already applies
// (optionsSignalGovernance.js), not a second, competing list.
const { FORBIDDEN_COMMITTEE_KEYS } = require("../canonicalVerdict");

const FORBIDDEN_GOVERNANCE_KEYS = [...FORBIDDEN_COMMITTEE_KEYS];

const SIGNAL_LABEL = "Signal — not a recommendation";

/**
 * Strips any forbidden governance key from a sentiment reading before it
 * is ever persisted or returned — structural, independent of whatever a
 * component scorer happens to compute.
 */
function sanitizeSentimentReading(reading) {
  if (!reading || typeof reading !== "object") return reading;
  const sanitized = { ...reading };
  for (const key of FORBIDDEN_GOVERNANCE_KEYS) {
    delete sanitized[key];
  }
  sanitized.label = SIGNAL_LABEL;
  return sanitized;
}

/**
 * A hard, throwing assertion — for internal invariant checks/tests that
 * want to prove a forbidden key was never present in the first place.
 */
function assertNoGovernanceViolation(reading) {
  if (!reading || typeof reading !== "object") return;
  const present = FORBIDDEN_GOVERNANCE_KEYS.filter((key) => key in reading);
  if (present.length) {
    throw new Error(`MarketSentimentReading governance violation — forbidden field(s) present: ${present.join(", ")}. The sentiment engine must never emit an action/decision/verdict/recommendation field.`);
  }
}

module.exports = {
  FORBIDDEN_GOVERNANCE_KEYS,
  SIGNAL_LABEL,
  sanitizeSentimentReading,
  assertNoGovernanceViolation,
};
