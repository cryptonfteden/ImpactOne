// Phase COMMERCIAL-MVP-001 — Commercial Infrastructure. Real,
// fail-closed authentication. This deliberately DIVERGES from
// `requireApiKey.js`'s own "warn once, then pass through unconfigured"
// precedent: that shape is correct for an operator-configured admin
// gate that must stay backward compatible until explicitly turned on.
// Real user authentication for paying-customer endpoints must never
// have a silent bypass — a missing/invalid/expired/revoked token is
// always a real 401, with no configuration state that ever lets it
// through. `req.userId` is only ever set on a real, verified token.
const authService = require("../services/authService");

function extractBearerToken(req) {
  const header = req.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

async function requireAuth(req, res, next) {
  try {
    const token = extractBearerToken(req);
    const { userId } = await authService.verifyToken(token);
    req.userId = userId;
    next();
  } catch (error) {
    const statusCode = error.statusCode || 401;
    res.status(statusCode).json({ error: error.message, errorCode: error.errorCode || "UNAUTHORIZED" });
  }
}

module.exports = { requireAuth, extractBearerToken };
