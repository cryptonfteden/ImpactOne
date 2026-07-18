const analyticsEventRepository = require("./analyticsEventRepository");

// Sprint 35 Priority 5, extended Sprint 36 Priority 1 — Private Beta
// Telemetry / Time To Value. An unrecognized eventName is rejected rather
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
  // Sprint 36 — two more Time To Value milestones the mission names that
  // didn't already have a real trigger point: the first moment Home
  // shows genuine content (not a loading/error state), and a stronger
  // "actually engaged with this recommendation's reasoning" signal
  // distinct from merely opening it.
  "first_useful_information",
  "recommendation_understood",
]);

// Every property key any event is allowed to carry. Anything else —
// including if a caller ever accidentally passed something from the
// investor profile (age, country, income) — is silently dropped, not
// stored. Values are also constrained to primitives so a caller can't
// smuggle a nested object holding unexpected fields.
const ALLOWED_PROPERTY_KEYS = new Set(["symbol", "action", "feedbackType", "cardKey"]);

// Sprint 36 — a random, client-generated UUID (crypto.randomUUID), never
// anything resembling a device fingerprint or account identifier.
// Validated as UUID-shaped so a caller can't smuggle other data into this
// column under the sessionId name.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

function sanitizeSessionId(sessionId) {
  return typeof sessionId === "string" && UUID_PATTERN.test(sessionId) ? sessionId : null;
}

async function recordEvent({ eventName, properties, sessionId }) {
  if (!ALLOWED_EVENTS.has(eventName)) {
    const error = new Error(`Unknown analytics event: ${eventName}`);
    error.status = 400;
    throw error;
  }
  return analyticsEventRepository.createEvent({
    eventName,
    properties: sanitizeProperties(properties),
    sessionId: sanitizeSessionId(sessionId),
  });
}

module.exports = { recordEvent, ALLOWED_EVENTS };
