// Phase AI-ENGINE-003 — Platform Intelligence Bus. Governance: the Bus
// is the one remaining place a forbidden verdict-style field could leak
// through to a consumer, since "consumers read only from the Bus" means
// consumers no longer see each engine's own output directly to catch it
// there. Reuses canonicalVerdict.js's exact FORBIDDEN_COMMITTEE_KEYS —
// the same denylist the Committee, the Options Agent
// (optionsSignalGovernance.js), and the Sentiment Engine
// (marketSentimentGovernance.js) already enforce, not a fourth,
// competing list.
const { FORBIDDEN_COMMITTEE_KEYS } = require("../canonicalVerdict");

const FORBIDDEN_GOVERNANCE_KEYS = [...FORBIDDEN_COMMITTEE_KEYS];

const SIGNAL_LABEL = "Signal — not a recommendation";

/**
 * Strips any forbidden key from the event's payload (the one place an
 * engine's own output is nested) and from the top-level event object,
 * then attaches the required label — applied to every event both before
 * persistence and before delivery to a subscriber, so neither path can
 * bypass it.
 */
function sanitizeEvent(event) {
  if (!event || typeof event !== "object") return event;
  const sanitized = { ...event };
  for (const key of FORBIDDEN_GOVERNANCE_KEYS) {
    delete sanitized[key];
  }
  if (sanitized.payload && typeof sanitized.payload === "object" && !Array.isArray(sanitized.payload)) {
    const sanitizedPayload = { ...sanitized.payload };
    for (const key of FORBIDDEN_GOVERNANCE_KEYS) {
      delete sanitizedPayload[key];
    }
    sanitized.payload = sanitizedPayload;
  }
  sanitized.label = SIGNAL_LABEL;
  return sanitized;
}

function assertNoGovernanceViolation(event) {
  if (!event || typeof event !== "object") return;
  const topLevelViolations = FORBIDDEN_GOVERNANCE_KEYS.filter((key) => key in event);
  const payloadViolations = event.payload && typeof event.payload === "object" ? FORBIDDEN_GOVERNANCE_KEYS.filter((key) => key in event.payload) : [];
  const present = [...topLevelViolations, ...payloadViolations.map((key) => `payload.${key}`)];
  if (present.length) {
    throw new Error(`IntelligenceBusEvent governance violation — forbidden field(s) present: ${present.join(", ")}. No engine may publish an action/decision/verdict/recommendation through the Bus.`);
  }
}

module.exports = { FORBIDDEN_GOVERNANCE_KEYS, SIGNAL_LABEL, sanitizeEvent, assertNoGovernanceViolation };
