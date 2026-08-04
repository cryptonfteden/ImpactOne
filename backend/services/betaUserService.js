// Phase X4 — Beta Identity Flow. Real business logic on top of the Phase
// H2 betaUserRepository: expiry-aware invite resolution and a real
// "whoami" identity check, so the frontend never has to guess whether a
// stored identity is still valid — it can ask.
const betaUserRepository = require("./betaUserRepository");

const RESOLVE_ERROR = {
  MISSING_CODE: "MISSING_CODE",
  INVALID_CODE: "INVALID_CODE",
  EXPIRED_CODE: "EXPIRED_CODE",
};

function badRequest(message, code) {
  const error = new Error(message);
  error.statusCode = 400;
  error.errorCode = code;
  return error;
}

function notFound(message, code) {
  const error = new Error(message);
  error.statusCode = 404;
  error.errorCode = code;
  return error;
}

function gone(message, code) {
  const error = new Error(message);
  error.statusCode = 410; // Gone — the real, correct HTTP status for "this used to exist/be valid, no longer is"
  error.errorCode = code;
  return error;
}

// Real expiry check — a null expiresAt honestly means "no expiry set,"
// never treated as expired by assumption.
function isExpired(betaUser) {
  return Boolean(betaUser.expiresAt) && new Date(betaUser.expiresAt).getTime() < Date.now();
}

async function resolveInviteCode(code) {
  const trimmed = String(code || "").trim();
  if (!trimmed) {
    throw badRequest("An invite code is required.", RESOLVE_ERROR.MISSING_CODE);
  }

  const betaUser = await betaUserRepository.findByInviteCode(trimmed);
  if (!betaUser) {
    throw notFound("That invite code wasn't recognized.", RESOLVE_ERROR.INVALID_CODE);
  }

  if (isExpired(betaUser)) {
    throw gone("That invite code has expired.", RESOLVE_ERROR.EXPIRED_CODE);
  }

  return { betaUserId: betaUser.id, label: betaUser.label };
}

// Real identity-validity check — lets the frontend confirm a locally
// stored betaUserId still resolves to a real, non-expired BetaUser
// before trusting it, rather than discovering it's stale only when a
// protected feature returns a confusing error.
async function whoami(betaUserId) {
  if (!betaUserId) return null;
  const betaUser = await betaUserRepository.findById(betaUserId).catch(() => null);
  if (!betaUser || isExpired(betaUser)) return null;
  return { betaUserId: betaUser.id, label: betaUser.label };
}

module.exports = { resolveInviteCode, whoami, isExpired, RESOLVE_ERROR };
