// Phase COMMERCIAL-MVP-001 — Commercial Infrastructure. `userId` is
// `@unique` on this model (one active subscription record per real
// user) — `upsertForUser` is the one, bounded, disclosed write path,
// same "narrow, single-purpose repository method, never a generic
// update" convention `claimRepository.updateClaimScalars` already
// established.
const { getPrismaClient } = require("../db/prismaClient");

async function findByUserId(userId) {
  const prisma = getPrismaClient();
  return prisma.subscription.findUnique({ where: { userId } });
}

async function upsertForUser(userId, data) {
  const prisma = getPrismaClient();
  return prisma.subscription.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
}

// A real, plain update for a subscription row already confirmed to
// exist (cancellation, a real webhook status change) — deliberately
// NOT `upsertForUser`, which requires a full `planId`/`billingProvider`
// payload for its own `create` branch even when that branch will never
// actually run. Confirmed live during development: calling
// `upsertForUser` with only `{status, cancelAtPeriodEnd}` threw a real
// Prisma validation error demanding `planId` for a row that already
// existed — this function is the fix, not a workaround.
async function updateForUser(userId, data) {
  const prisma = getPrismaClient();
  return prisma.subscription.update({ where: { userId }, data });
}

module.exports = { findByUserId, upsertForUser, updateForUser };
