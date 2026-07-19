const { getPrismaClient } = require("../db/prismaClient");

async function createPrinciple(data) {
  const prisma = getPrismaClient();
  return prisma.tradingPrinciple.create({ data });
}

async function listPrinciples() {
  const prisma = getPrismaClient();
  return prisma.tradingPrinciple.findMany({ orderBy: { createdAt: "desc" } });
}

async function getPrinciple(id) {
  const prisma = getPrismaClient();
  return prisma.tradingPrinciple.findUnique({ where: { id } });
}

async function recordBacktestResult(data) {
  const prisma = getPrismaClient();
  return prisma.principleBacktestResult.create({ data });
}

async function listBacktestResultsForPrinciple(principleId) {
  const prisma = getPrismaClient();
  return prisma.principleBacktestResult.findMany({ where: { principleId }, orderBy: { testedAt: "desc" } });
}

module.exports = { createPrinciple, listPrinciples, getPrinciple, recordBacktestResult, listBacktestResultsForPrinciple };
