const { getPrismaClient } = require("../db/prismaClient");

// Phase H2 — Beta User Isolation (approved F2 design, implemented as
// specified). No password/hash: an invite code is an identifier, not a
// secret guarding sensitive data, appropriate for a 5-person trusted
// closed beta (see BETA_USER_ISOLATION_PLAN.md).

async function findByInviteCode(inviteCode) {
  const prisma = getPrismaClient();
  return prisma.betaUser.findUnique({ where: { inviteCode } });
}

async function findById(id) {
  const prisma = getPrismaClient();
  return prisma.betaUser.findUnique({ where: { id } });
}

async function createBetaUser({ label, inviteCode }) {
  const prisma = getPrismaClient();
  return prisma.betaUser.create({ data: { label, inviteCode } });
}

async function listBetaUsers() {
  const prisma = getPrismaClient();
  return prisma.betaUser.findMany({ orderBy: { createdAt: "asc" } });
}

module.exports = { findByInviteCode, findById, createBetaUser, listBetaUsers };
