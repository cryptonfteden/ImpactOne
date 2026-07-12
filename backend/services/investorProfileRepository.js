const { getPrismaClient } = require("../db/prismaClient");

// All raw Prisma access for InvestorProfile lives in this file, mirroring
// portfolioRepository.js's singleton pattern. Unlike Portfolio there is no
// sensible default to create-on-first-read — age has no universal default —
// so this file exposes find/create/update, not a find-or-create.

async function findDefaultInvestorProfile() {
  const prisma = getPrismaClient();
  return prisma.investorProfile.findFirst({ orderBy: { createdAt: "asc" } });
}

async function createInvestorProfile(data) {
  const prisma = getPrismaClient();
  return prisma.investorProfile.create({ data });
}

async function updateInvestorProfile(id, data) {
  const prisma = getPrismaClient();
  return prisma.investorProfile.update({ where: { id }, data });
}

module.exports = {
  findDefaultInvestorProfile,
  createInvestorProfile,
  updateInvestorProfile,
};
