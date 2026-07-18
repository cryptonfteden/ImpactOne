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
  await prisma.themeConfidenceSnapshot.deleteMany();
  await prisma.canonicalEvent.deleteMany();
  await prisma.providerRunLog.deleteMany();

  // World Memory (Sprint 21B) — satellites before the spine, since none of
  // these use enforced Prisma-level FK relations (plain string reference
  // columns, same convention as CanonicalEvent.providerId), but this keeps
  // the deletion order honest for when relations are added later.
  await prisma.worldMemoryLesson.deleteMany();
  await prisma.outcome.deleteMany();
  await prisma.worldMemoryPrediction.deleteMany();
  await prisma.worldMemoryThesisRevision.deleteMany();
  await prisma.worldMemorySectorImpact.deleteMany();
  await prisma.worldMemoryStateChange.deleteMany();
  await prisma.worldMemoryCausalLink.deleteMany();
  await prisma.worldMemoryRecord.deleteMany();

  // Sprint 30 — User Memory (standalone, no FK relation to clean up first).
  await prisma.userMemoryEvent.deleteMany();

  // Sprint 35 — Private Beta Telemetry (standalone, no FK relations).
  await prisma.analyticsEvent.deleteMany();
}

module.exports = { truncateAll };
