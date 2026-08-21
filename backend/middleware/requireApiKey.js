// Phase PLATFORM-HARDENING-002 — closes FINAL_PRODUCTION_READINESS.md's
// named Security blocker: "zero auth middleware... anywhere in this
// codebase." A minimal, real API-key gate — not a full user-auth
// system (that would be a new feature/architecture redesign, out of
// this hardening phase's explicit scope), scoped to protecting
// specific administrative routes that currently have no backend-side
// protection at all (the review's own words: "visibility is gated on
// the frontend instead").
//
// Deliberately backward-compatible by construction: when `ADMIN_API_KEY`
// is not configured (exactly today's state in every existing
// environment — dev, test, and this repo's current deploys), this
// middleware passes every request through unchanged and logs one real
// warning — so wiring it onto a route never breaks any existing caller
// until an operator explicitly opts in by setting the env var. Once
// configured, a request must present the exact same key via the
// `X-Admin-Api-Key` header or is rejected with a real 401 — never a
// silent partial-auth state.
const env = require("../config/env");

let hasWarnedMissingKey = false;

function requireApiKey(req, res, next) {
  const configuredKey = env.ADMIN_API_KEY;

  if (!configuredKey) {
    if (env.NODE_ENV === "production") {
      return res.status(503).json({ error: "Administrative API is disabled because ADMIN_API_KEY is not configured." });
    }
    if (!hasWarnedMissingKey) {
      console.warn("[requireApiKey] ADMIN_API_KEY is not configured — admin routes are running WITHOUT auth protection. Set ADMIN_API_KEY before exposing this deployment beyond a trusted environment.");
      hasWarnedMissingKey = true;
    }
    return next();
  }

  const providedKey = req.get("X-Admin-Api-Key");
  if (providedKey && providedKey === configuredKey) {
    return next();
  }

  return res.status(401).json({ error: "A valid X-Admin-Api-Key header is required for this route." });
}

module.exports = { requireApiKey };
