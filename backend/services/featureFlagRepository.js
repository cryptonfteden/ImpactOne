const { getPrismaClient } = require("../db/prismaClient");

async function listFlags() {
  const prisma = getPrismaClient();
  return prisma.featureFlag.findMany({ orderBy: { key: "asc" } });
}

async function getFlag(key) {
  const prisma = getPrismaClient();
  return prisma.featureFlag.findUnique({ where: { key } });
}

async function upsertFlag(key, data) {
  const prisma = getPrismaClient();
  return prisma.featureFlag.upsert({
    where: { key },
    update: data,
    create: { key, ...data },
  });
}

module.exports = { listFlags, getFlag, upsertFlag };
