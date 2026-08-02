// Phase COMMERCIAL-MVP-001 — Commercial Infrastructure. Thin, one-
// function-per-Prisma-operation repository — same convention as
// betaUserRepository.js/claimRepository.js: no business logic, no
// error wrapping, always re-fetches getPrismaClient() inside each
// function.
const { getPrismaClient } = require("../db/prismaClient");

async function createUser({ email, passwordHash, betaUserId = null }) {
  const prisma = getPrismaClient();
  return prisma.user.create({ data: { email, passwordHash, betaUserId } });
}

async function findByEmail(email) {
  const prisma = getPrismaClient();
  return prisma.user.findUnique({ where: { email } });
}

async function findById(id) {
  const prisma = getPrismaClient();
  return prisma.user.findUnique({ where: { id } });
}

module.exports = { createUser, findByEmail, findById };
