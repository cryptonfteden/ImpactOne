const analyticsEventRepository = require("./analyticsEventRepository");

// Sprint 35 Priority 5, extended Sprint 36/40, extended Phase X9 — Part 1
// (Product Analytics). An unrecognized eventName is rejected rather than
// silently accepted, so this can never quietly grow into a general-
// purpose "track anything" pipe. Phase X9 adds the mission's full
// required event catalog on top of the pre-existing Time-To-Value set —
// both share this one allowlist and one storage table, never a second,
// duplicate tracking pipe.
const ALLOWED_EVENTS = new Set([
  // Pre-existing (Sprint 35/36/40) — unchanged.
  "first_open",
  "onboarding_completed",
  "recommendation_viewed",
  "recommendation_expanded",
  "feedback_submitted",
  "morning_brief_read",
  "returning_user",
  "first_useful_information",
  "recommendation_understood",
  "onboarding_step_completed",
  "onboarding_step_skipped",
  "search_conversational_used",
  "first_recommendation_rendered",
  // Phase X9 — Part 1's explicit required catalog.
  "app_opened",
  "login",
  "logout",
  "invite_accepted",
  "screen_viewed",
  "recommendation_opened",
  "decision_center_viewed",
  "ai_analysis_opened",
  "portfolio_viewed",
  "market_dashboard_viewed",
  "impact_graph_viewed",
  "notification_clicked",
  "workspace_created",
  "workspace_deleted",
  "settings_changed",
  "error_encountered",
  "session_ended",
  // Phase X10 — Part 1, User Learning Engine. The mission-named
  // interactions with no existing real trigger: explicit save/dismiss on
  // a recommendation (distinct from the passive recommendation_viewed/
  // recommendation_opened already tracked), a real chart open (distinct
  // from ai_analysis_opened, which is the whole screen, not the chart
  // widget specifically), a real symbol added to a workspace (the
  // concrete signal "watchlisted" means), and explanation
  // expand/collapse as two distinct real events (recommendation_expanded
  // already exists for "expand"; collapse had no counterpart).
  "recommendation_saved",
  "recommendation_dismissed",
  "chart_opened",
  "symbol_watchlisted",
  "explanation_collapsed",
]);

// Every property key any event is allowed to carry. Anything else —
// including if a caller ever accidentally passed something from the
// investor profile (age, country, income) — is silently dropped, not
// stored. Values are also constrained to primitives so a caller can't
// smuggle a nested object holding unexpected fields.
const ALLOWED_PROPERTY_KEYS = new Set([
  "symbol", "action", "feedbackType", "cardKey", "stepKey", "stepIndex", "durationMs",
  // Phase X9 — real, bounded metadata for the new event catalog. Still
  // an explicit allowlist, not an open bag.
  "settingKey", "workspaceId", "notificationId", "errorScope",
  // Phase X10 — real, bounded metadata for the User Learning Engine and
  // Recommendation Quality Engine: which specific recommendation an
  // interaction was about, and which real news source an explanation
  // section referenced.
  "recommendationId", "sourceName",
]);

// Sprint 36 — a random, client-generated UUID (crypto.randomUUID), never
// anything resembling a device fingerprint or account identifier.
// Validated as UUID-shaped so a caller can't smuggle other data into this
// column under the sessionId name.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Phase X9 — every real screen this product has (kept in sync with
// Sidebar.jsx / screenRegistry.js's real screenMap keys) — an unknown
// screen value is dropped, never stored as a free-form string, so this
// column stays a real, closed dimension usable for GROUP BY without
// normalization.
const KNOWN_SCREENS = new Set([
  "Home", "Market Dashboard", "Decision Center", "Portfolio", "Watchlist Folders",
  "Decision Timeline", "Market Positioning", "Global Intelligence", "AI Analysis",
  "Recommendations", "Daily Feed", "Themes", "Alerts", "My Profile", "Settings",
  "Watchlist", "Intelligence Console", "Health Dashboard", "Admin Dashboard",
]);

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

function sanitizeScreen(screen) {
  return typeof screen === "string" && KNOWN_SCREENS.has(screen) ? screen : null;
}

function sanitizeDuration(durationMs) {
  return Number.isFinite(durationMs) && durationMs >= 0 ? Math.round(durationMs) : null;
}

async function recordEvent({ eventName, properties, sessionId, betaUserId, screen, durationMs }) {
  if (!ALLOWED_EVENTS.has(eventName)) {
    const error = new Error(`Unknown analytics event: ${eventName}`);
    error.status = 400;
    throw error;
  }
  return analyticsEventRepository.createEvent({
    eventName,
    properties: sanitizeProperties(properties),
    sessionId: sanitizeSessionId(sessionId),
    betaUserId: betaUserId || null,
    screen: sanitizeScreen(screen),
    durationMs: sanitizeDuration(durationMs),
  });
}

module.exports = { recordEvent, ALLOWED_EVENTS, KNOWN_SCREENS };
