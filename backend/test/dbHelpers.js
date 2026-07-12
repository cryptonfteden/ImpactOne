const { getPrismaClient } = require("../db/prismaClient");

// Deletion order respects foreign keys: ledger entries and trades
// reference orders/positions/portfolios, so they go first.
async function truncateAll() {
  const prisma = getPrismaClient();
  await prisma.cashLedgerEntry.deleteMany();
  await prisma.trade.deleteMany();
  await prisma.order.deleteMany();
  await prisma.position.deleteMany();
  await prisma.performanceSnapshot.deleteMany();
  await prisma.portfolio.deleteMany();
  await prisma.dailyBriefSnapshot.deleteMany();
  await prisma.decisionTrace.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.autonomousRunLog.deleteMany();
  await prisma.investorProfile.deleteMany();
}

module.exports = { truncateAll };
