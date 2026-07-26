const betaUserRepository = require("../services/betaUserRepository");

// Phase H2 — Beta User Isolation. Reads the X-Beta-User-Id header (set by
// the frontend's apiClient.js once an invite code has been resolved),
// validates it against a real BetaUser row, and attaches req.betaUserId.
// Best-effort by design: an absent or unrecognized header never errors
// the request — req.betaUserId simply stays undefined, and every
// downstream service falls back to its exact pre-H2 singleton behavior
// (see API_IMPACT_REPORT.md's backward-compatibility guarantee).
async function betaUserContext(req, res, next) {
  const headerValue = req.get("X-Beta-User-Id");
  if (!headerValue) {
    return next();
  }

  try {
    const betaUser = await betaUserRepository.findById(headerValue);
    if (betaUser) {
      req.betaUserId = betaUser.id;
    }
  } catch {
    // Malformed id (e.g. not a valid UUID) — treated the same as "no
    // header," never a request-blocking error.
  }
  next();
}

module.exports = { betaUserContext };
