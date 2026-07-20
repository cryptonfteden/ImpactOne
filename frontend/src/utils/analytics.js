// Sprint 35 Priority 5 — Private Beta Telemetry. Anonymous, fire-and-
// forget: never awaited by a caller, never throws, never blocks or
// delays any UI interaction, and never sends anything from the investor
// profile (age, country, income, risk tolerance, etc.) — only the fixed
// shape metadata each event actually needs (e.g. a recommendation's own
// symbol/action). The backend independently re-validates both the event
// name and property keys against its own allowlist (analyticsService.js)
// so this file being wrong or tampered with client-side can't smuggle
// anything unexpected into storage.
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const ALLOWED_EVENTS = new Set([
  "first_open",
  "onboarding_completed",
  "recommendation_viewed",
  "recommendation_expanded",
  "feedback_submitted",
  "morning_brief_read",
  "returning_user",
  "first_useful_information",
  "recommendation_understood",
  // Sprint 40 — Product Excellence: onboarding per-step drop-off, real
  // conversational search usage, and first recommendation actually seen.
  "onboarding_step_completed",
  "onboarding_step_skipped",
  "search_conversational_used",
  "first_recommendation_rendered",
]);

// Sprint 36 Priority 1 — Time To Value measurement. A random correlation
// token (crypto.randomUUID), generated once per browser and reused for
// its whole lifetime — not a device fingerprint or account identifier,
// carries no PII, exists purely so ttvMetricsService can measure "how
// long from this browser's first_open to its first X" across visits.
const SESSION_ID_KEY = "impactone-session-id";

function getSessionId() {
  if (typeof window === "undefined") return null;
  try {
    let sessionId = window.localStorage.getItem(SESSION_ID_KEY);
    if (!sessionId) {
      sessionId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : null;
      if (sessionId) window.localStorage.setItem(SESSION_ID_KEY, sessionId);
    }
    return sessionId;
  } catch {
    return null;
  }
}

export function trackEvent(eventName, properties = {}) {
  if (!ALLOWED_EVENTS.has(eventName)) return;
  if (typeof fetch !== "function") return;

  fetch(`${API_BASE}/v2/analytics/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventName, properties, sessionId: getSessionId() }),
    keepalive: true,
  }).catch(() => {
    // Telemetry failing silently is correct behavior — never surface a
    // network error to the user for an analytics call they didn't
    // initiate and can't act on.
  });
}
