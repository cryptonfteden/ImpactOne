// Phase COMMERCIAL-MVP-001 — Commercial Infrastructure. Real, revocable
// server-side session records, keyed by a real SHA-256 hash of the
// issued token (never the raw token itself — see authService.js).
const { getPrismaClient } = require("../db/prismaClient");

async function createSession({ userId, tokenHash, expiresAt }) {
  const prisma = getPrismaClient();
  return prisma.session.create({ data: { userId, tokenHash, expiresAt } });
}

async function findByTokenHash(tokenHash) {
  const prisma = getPrismaClient();
  return prisma.session.findUnique({ where: { tokenHash } });
}

async function revokeByTokenHash(tokenHash, { now = new Date() } = {}) {
  const prisma = getPrismaClient();
  return prisma.session.updateMany({ where: { tokenHash, revokedAt: null }, data: { revokedAt: now } });
}

module.exports = { createSession, findByTokenHash, revokeByTokenHash };
