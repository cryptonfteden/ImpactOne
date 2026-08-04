const betaUserService = require("../services/betaUserService");

function handleKnownError(error, res, next) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ error: error.message, errorCode: error.errorCode });
  }
  return next(error);
}

// Phase H2/X4 — resolves a founder-issued invite code to a betaUserId.
// Not a login: no session, no password — the returned id is stored
// client-side and sent back as a header. Distinguishes MISSING_CODE /
// INVALID_CODE / EXPIRED_CODE so the frontend can show a specific,
// never-raw-technical message (see BETA_IDENTITY_FLOW.md).
async function resolveInviteCode(req, res, next) {
  try {
    const result = await betaUserService.resolveInviteCode(req.query.code);
    res.json(result);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

// Phase X4 — lets the frontend confirm a locally stored identity is
// still real and non-expired before trusting it.
async function whoami(req, res, next) {
  try {
    const identity = await betaUserService.whoami(req.betaUserId);
    if (!identity) {
      return res.status(404).json({ error: "No valid identity.", errorCode: "NO_IDENTITY" });
    }
    res.json(identity);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

module.exports = { resolveInviteCode, whoami };
