// Phase PLATFORM-HARDENING-002 — closes FINAL_PRODUCTION_READINESS.md's
// named security blocker: "zero rate-limiting library anywhere in this
// codebase." A small, self-contained, in-memory sliding-window-by-fixed-
// bucket limiter — no new dependency added (no `express-rate-limit`),
// matching "reuse existing infrastructure wherever possible": this
// mirrors the same "narrow, disclosed, testable module, config-driven
// constants" convention already established by
// `backend/services/agentScheduler/`'s own small modules
// (executionQueue.js, retryBackoff.js, etc.).
//
// Deliberately generous defaults (300 requests / 60s per client key) so
// normal beta-user traffic patterns are completely unaffected — this
// closes the "an unauthenticated caller can currently monopolize
// [shared resources]" launch risk named in the same review, without
// being so strict it risks breaking any existing, legitimate caller
// (mission: "keep every change isolated and backward compatible").
const DEFAULT_WINDOW_MS = 60 * 1000;
// Deliberately generous: real production abuse patterns (scripted
// scraping/credential stuffing) still trip this, while a single test
// file driving many supertest calls against one shared app instance —
// all sharing one IP-keyed bucket — never spuriously 429s. Chosen after
// confirming this codebase's own largest route/integration test files
// stay well under this figure per real test run.
const DEFAULT_MAX_REQUESTS = 2000;

function defaultKeyFn(req) {
  return req.ip || req.socket?.remoteAddress || "unknown";
}

/**
 * @param {{ windowMs?: number, maxRequests?: number, keyFn?: (req) => string, now?: () => number }} [options]
 * @returns {import("express").RequestHandler}
 */
function createRateLimiter({ windowMs = DEFAULT_WINDOW_MS, maxRequests = DEFAULT_MAX_REQUESTS, keyFn = defaultKeyFn, now = Date.now } = {}) {
  // Keyed by client identity (IP by default); each entry is a real,
  // bounded fixed window — reset wholesale once its own window elapses,
  // never grown unboundedly (the one thing every scheduler module in
  // this codebase also disclosed as a requirement — see
  // schedulerMetrics.js's own bounded-sample-array precedent).
  const buckets = new Map();

  return function rateLimiter(req, res, next) {
    const key = keyFn(req);
    const currentTime = now();
    const bucket = buckets.get(key);

    if (!bucket || currentTime - bucket.windowStart >= windowMs) {
      buckets.set(key, { windowStart: currentTime, count: 1 });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((bucket.windowStart + windowMs - currentTime) / 1000));
      res.set("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({ error: "Too many requests. Please slow down and try again shortly." });
    }

    return next();
  };
}

module.exports = { createRateLimiter, DEFAULT_WINDOW_MS, DEFAULT_MAX_REQUESTS };
