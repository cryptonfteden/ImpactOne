// Phase COMMERCIAL-MVP-001 — Commercial Infrastructure. Real,
// per-user/per-feature/per-period usage counters. `incrementAndGet` is
// a single, atomic upsert (Postgres-level, via Prisma's own
// upsert+increment) — never a read-then-write race between two
// concurrent requests for the same user/feature/period.
const { getPrismaClient } = require("../db/prismaClient");

async function getCount(userId, featureKey, periodStart) {
  const prisma = getPrismaClient();
  const row = await prisma.usageCounter.findUnique({
    where: { userId_featureKey_periodStart: { userId, featureKey, periodStart } },
  });
  return row ? row.count : 0;
}

async function incrementAndGet(userId, featureKey, periodStart) {
  const prisma = getPrismaClient();
  const row = await prisma.usageCounter.upsert({
    where: { userId_featureKey_periodStart: { userId, featureKey, periodStart } },
    update: { count: { increment: 1 } },
    create: { userId, featureKey, periodStart, count: 1 },
  });
  return row.count;
}

module.exports = { getCount, incrementAndGet };
