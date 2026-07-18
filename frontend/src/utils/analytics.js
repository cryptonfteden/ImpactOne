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
]);

export function trackEvent(eventName, properties = {}) {
  if (!ALLOWED_EVENTS.has(eventName)) return;
  if (typeof fetch !== "function") return;

  fetch(`${API_BASE}/v2/analytics/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventName, properties }),
    keepalive: true,
  }).catch(() => {
    // Telemetry failing silently is correct behavior — never surface a
    // network error to the user for an analytics call they didn't
    // initiate and can't act on.
  });
}
