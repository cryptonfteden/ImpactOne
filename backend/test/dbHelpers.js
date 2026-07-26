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
  // Sprint 42 — Recommendation Lifecycle (plain string reference column,
  // same World Memory convention as everything else in this file).
  await prisma.recommendationLifecycleEvent.deleteMany();
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

  // Sprint 37 — Research Agent (results before principles, plain string
  // reference column, same World Memory convention).
  await prisma.principleBacktestResult.deleteMany();
  await prisma.tradingPrinciple.deleteMany();

  // Phase H3 — Watchlist Folders & Price Alerts (items/notes before
  // folders, real enforced FK; notification/priceAlert are standalone).
  // Phase X3 — WorkspaceNote added here too (same FK-to-folder shape).
  await prisma.watchlistFolderItem.deleteMany();
  await prisma.workspaceNote.deleteMany();
  await prisma.watchlistFolder.deleteMany();
  await prisma.priceAlert.deleteMany();
  await prisma.notification.deleteMany();
  // Phase X4 — Decision Center V1 real per-user pin/dismiss/complete state.
  await prisma.decisionState.deleteMany();

  // Phase X3 — Impact Graph (links before records, real FK-shaped
  // reference even though not DB-enforced, same convention as the rest
  // of the World Memory cluster above).
  await prisma.worldMemoryCausalLink.deleteMany();

  // Phase X9 — Private Beta Operations Platform (all standalone, no FK
  // relations to clean up first).
  await prisma.feedback.deleteMany();
  await prisma.errorReport.deleteMany();
  await prisma.featureFlag.deleteMany();

  // Phase X11 — Closed Learning Loop (all standalone, no FK relations to
  // clean up first).
  await prisma.scoringAdjustmentAudit.deleteMany();
  await prisma.sourceScoreSnapshot.deleteMany();
  await prisma.methodologyVersion.deleteMany();

  // Phase AI-ENGINE-001.1 — Unusual Options Agent foundation (all
  // standalone, loose string references only, no enforced FK relations
  // to clean up first).
  await prisma.optionsSignal.deleteMany();
  await prisma.optionsOpenInterestSnapshot.deleteMany();
  await prisma.optionsFlowPrint.deleteMany();

  // Phase AI-ENGINE-002.1 — Market Sentiment Engine foundation (standalone).
  await prisma.marketSentimentSnapshot.deleteMany();

  // Phase AI-ENGINE-003 — Platform Intelligence Bus (standalone).
  await prisma.intelligenceBusEvent.deleteMany();

  // Phase AI-CORE-001 — Claim Intelligence Layer (evidence/transitions/
  // outcomes before claims, plain string reference columns only).
  await prisma.claimEvidence.deleteMany();
  await prisma.claimTransition.deleteMany();
  await prisma.claimOutcome.deleteMany();
  await prisma.claim.deleteMany();
}

module.exports = { truncateAll };
