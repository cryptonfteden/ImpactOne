const { getPrismaClient } = require("../db/prismaClient");

// Phase X4 — Decision Center V1 real per-user state. upsert, not
// create-then-update: pinning an already-pinned item, or re-dismissing,
// is idempotent and never creates a duplicate row (unique on
// [betaUserId, decisionKey]).
async function setStatus(betaUserId, decisionKey, status) {
  const prisma = getPrismaClient();
  return prisma.decisionState.upsert({
    where: { betaUserId_decisionKey: { betaUserId, decisionKey } },
    update: { status },
    create: { betaUserId, decisionKey, status },
  });
}

async function clearStatus(betaUserId, decisionKey) {
  const prisma = getPrismaClient();
  return prisma.decisionState.deleteMany({ where: { betaUserId, decisionKey } });
}

async function listForUser(betaUserId) {
  const prisma = getPrismaClient();
  return prisma.decisionState.findMany({ where: { betaUserId } });
}

module.exports = { setStatus, clearStatus, listForUser };
