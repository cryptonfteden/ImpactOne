const { getPrismaClient } = require("../db/prismaClient");

async function createErrorReport(data) {
  const prisma = getPrismaClient();
  return prisma.errorReport.create({ data });
}

async function listErrorReports({ limit = 200 } = {}) {
  const prisma = getPrismaClient();
  return prisma.errorReport.findMany({ orderBy: { createdAt: "desc" }, take: limit });
}

async function countBySource() {
  const prisma = getPrismaClient();
  const rows = await prisma.errorReport.groupBy({ by: ["source"], _count: { _all: true } });
  return rows.map((row) => ({ source: row.source, count: row._count._all }));
}

async function count() {
  const prisma = getPrismaClient();
  return prisma.errorReport.count();
}

module.exports = { createErrorReport, listErrorReports, countBySource, count };
