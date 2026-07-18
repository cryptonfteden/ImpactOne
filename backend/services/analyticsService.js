const analyticsEventRepository = require("./analyticsEventRepository");

// Sprint 35 Priority 5 — Private Beta Telemetry. Exactly the 7 events the
// mission names, no more — an unrecognized eventName is rejected rather
// than silently accepted, so this can never quietly grow into a general-
// purpose "track anything" pipe.
const ALLOWED_EVENTS = new Set([
  "first_open",
  "onboarding_completed",
  "recommendation_viewed",
  "recommendation_expanded",
  "feedback_submitted",
  "morning_brief_read",
  "returning_user",
]);

// Every property key any of the 7 events is allowed to carry. Anything
// else — including if a caller ever accidentally passed something from
// the investor profile (age, country, income) — is silently dropped, not
// stored. Values are also constrained to primitives so a caller can't
// smuggle a nested object holding unexpected fields.
const ALLOWED_PROPERTY_KEYS = new Set(["symbol", "action", "feedbackType", "cardKey"]);

function sanitizeProperties(properties) {
  if (!properties || typeof properties !== "object") return {};
  const clean = {};
  for (const [key, value] of Object.entries(properties)) {
    if (!ALLOWED_PROPERTY_KEYS.has(key)) continue;
    if (value === null || ["string", "number", "boolean"].includes(typeof value)) {
      clean[key] = value;
    }
  }
  return clean;
}

async function recordEvent({ eventName, properties }) {
  if (!ALLOWED_EVENTS.has(eventName)) {
    const error = new Error(`Unknown analytics event: ${eventName}`);
    error.status = 400;
    throw error;
  }
  return analyticsEventRepository.createEvent({ eventName, properties: sanitizeProperties(properties) });
}

module.exports = { recordEvent, ALLOWED_EVENTS };
