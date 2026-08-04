// Phase COMMERCIAL-MVP-001 — Commercial Infrastructure. Real
// authentication: password hashing (bcryptjs), signed JWT access
// tokens, and a real, revocable server-side Session record per login —
// "session management" as a genuine, listable/revocable concept, not
// merely an unrevokable bearer token. Every validation error here
// throws a real `Error` with `.statusCode` (and, where useful,
// `.errorCode`) attached — the exact same convention
// betaUserService.js/featureFlagService.js already use, so
// controllers reuse the identical `handleKnownError` idiom.
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const env = require("../config/env");
const userRepository = require("./userRepository");
const sessionRepository = require("./sessionRepository");

const BCRYPT_SALT_ROUNDS = 10;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function httpError(message, statusCode, errorCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (errorCode) error.errorCode = errorCode;
  return error;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function assertValidEmail(email) {
  if (!email || !EMAIL_PATTERN.test(email)) {
    throw httpError("A valid email address is required.", 400, "INVALID_EMAIL");
  }
}

function assertValidPassword(password) {
  if (!password || String(password).length < MIN_PASSWORD_LENGTH) {
    throw httpError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`, 400, "INVALID_PASSWORD");
  }
}

/**
 * Issues a real, signed JWT plus a matching, revocable Session row.
 * The raw token is never persisted — only its SHA-256 hash.
 */
async function issueSession(userId) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + env.JWT_EXPIRES_IN_SECONDS * 1000);
  // A real, random `jti` (JWT ID) — without it, two logins for the
  // same real user within the same real second produce a byte-
  // identical signed JWT (identical payload + identical `iat` second),
  // which would collide on `Session.tokenHash`'s own real unique
  // constraint. Confirmed live during development (a register()
  // immediately followed by a login() reproduced this exact failure).
  const jti = crypto.randomUUID();
  const token = jwt.sign({ sub: userId, jti }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN_SECONDS });
  await sessionRepository.createSession({ userId, tokenHash: hashToken(token), expiresAt });
  return { token, expiresAt };
}

async function register(email, password) {
  const normalizedEmail = normalizeEmail(email);
  assertValidEmail(normalizedEmail);
  assertValidPassword(password);

  const existing = await userRepository.findByEmail(normalizedEmail);
  if (existing) {
    throw httpError("An account with this email already exists.", 409, "EMAIL_TAKEN");
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  const user = await userRepository.createUser({ email: normalizedEmail, passwordHash });
  const { token, expiresAt } = await issueSession(user.id);

  return { user: { id: user.id, email: user.email }, token, expiresAt };
}

async function login(email, password) {
  const normalizedEmail = normalizeEmail(email);
  const user = await userRepository.findByEmail(normalizedEmail);
  // Deliberately the exact same real error/message for "no such user"
  // and "wrong password" — never disclosing which one it was, a real,
  // standard account-enumeration protection.
  const invalidCredentialsError = httpError("Invalid email or password.", 401, "INVALID_CREDENTIALS");
  if (!user) {
    throw invalidCredentialsError;
  }

  const passwordMatches = await bcrypt.compare(String(password || ""), user.passwordHash);
  if (!passwordMatches) {
    throw invalidCredentialsError;
  }

  const { token, expiresAt } = await issueSession(user.id);
  return { user: { id: user.id, email: user.email }, token, expiresAt };
}

async function logout(token) {
  await sessionRepository.revokeByTokenHash(hashToken(token));
}

/**
 * Verifies a real JWT's signature/expiry AND that its matching Session
 * row is still real and un-revoked — a revoked/expired session is
 * honestly rejected even if the JWT signature itself is still
 * technically valid (real, fail-closed session management, not merely
 * stateless token verification).
 * @returns {Promise<{ userId: string }>} never returns on failure — always throws a real, typed error
 */
async function verifyToken(token) {
  if (!token) {
    throw httpError("Authentication required.", 401, "MISSING_TOKEN");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw httpError("Invalid or expired session.", 401, "INVALID_TOKEN");
  }

  const session = await sessionRepository.findByTokenHash(hashToken(token));
  if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) {
    throw httpError("Invalid or expired session.", 401, "INVALID_TOKEN");
  }

  return { userId: decoded.sub };
}

module.exports = { register, login, logout, verifyToken, MIN_PASSWORD_LENGTH };
