const { getPrismaClient } = require("../db/prismaClient");

async function createFeedback(data) {
  const prisma = getPrismaClient();
  return prisma.feedback.create({ data });
}

async function listFeedback({ limit = 200 } = {}) {
  const prisma = getPrismaClient();
  return prisma.feedback.findMany({ orderBy: { createdAt: "desc" }, take: limit });
}

async function countByType() {
  const prisma = getPrismaClient();
  const rows = await prisma.feedback.groupBy({ by: ["type"], _count: { _all: true } });
  return rows.map((row) => ({ type: row.type, count: row._count._all }));
}

async function count() {
  const prisma = getPrismaClient();
  return prisma.feedback.count();
}

module.exports = { createFeedback, listFeedback, countByType, count };
