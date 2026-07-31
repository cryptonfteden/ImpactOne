// Phase PLATFORM-HARDENING-002 — "Security headers," a named typical-
// scope item for closing FINAL_PRODUCTION_READINESS.md's Security
// blocker. A small, dependency-free set of standard, low-risk response
// headers (no `helmet` package added, per "reuse existing
// infrastructure wherever possible" — this is a handful of static
// header writes, not enough surface to justify a new dependency).
// Every header here is additive and non-breaking: none of them change
// response status, body, or any existing route's behavior.
function securityHeaders(req, res, next) {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("X-Frame-Options", "DENY");
  res.set("Referrer-Policy", "no-referrer");
  res.set("X-DNS-Prefetch-Control", "off");
  // Only asserted over an already-HTTPS connection — never forces a
  // scheme change or breaks local/dev HTTP traffic.
  if (req.secure) {
    res.set("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  }
  next();
}

module.exports = { securityHeaders };
