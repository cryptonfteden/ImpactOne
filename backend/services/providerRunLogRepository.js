const { getPrismaClient } = require("../db/prismaClient");

async function createRunLog(data) {
  const prisma = getPrismaClient();
  return prisma.providerRunLog.create({ data });
}

async function getRecentRunsForProvider(providerId, limit = 10) {
  const prisma = getPrismaClient();
  return prisma.providerRunLog.findMany({
    where: { providerId },
    orderBy: { startedAt: "desc" },
    take: limit,
  });
}

async function getLatestRunPerProvider() {
  const prisma = getPrismaClient();
  const providerIds = await prisma.providerRunLog.findMany({
    distinct: ["providerId"],
    select: { providerId: true },
  });
  const latestRuns = await Promise.all(
    providerIds.map(({ providerId }) =>
      prisma.providerRunLog.findFirst({ where: { providerId }, orderBy: { startedAt: "desc" } })
    )
  );
  return latestRuns.filter(Boolean);
}

module.exports = { createRunLog, getRecentRunsForProvider, getLatestRunPerProvider };
