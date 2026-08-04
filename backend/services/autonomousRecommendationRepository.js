const { getPrismaClient } = require("../db/prismaClient");

// All raw Prisma access for the Recommendation/AutonomousRunLog domain
// lives in this file, mirroring portfolioRepository.js's role.

async function createRecommendation(data) {
  const prisma = getPrismaClient();
  return prisma.recommendation.create({ data });
}

// Phase H2 — betaUserId is optional. Recommendations remain globally
// generated (per the G1 decision), so the scheduled engine never sets
// this field; passing it here is a no-op filter until a future per-user
// generation path exists (F2's documented Option 2, not built this
// phase). Omitted, this is the exact pre-H2 global-list behavior.
async function listActive({ limit = 50, betaUserId } = {}) {
  const prisma = getPrismaClient();
  const where = { status: "ACTIVE" };
  if (betaUserId) {
    where.betaUserId = betaUserId;
  }
  return prisma.recommendation.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

async function listAll({ status, symbol, limit = 100, betaUserId } = {}) {
  const prisma = getPrismaClient();
  const where = {};
  if (status) {
    where.status = status;
  }
  if (symbol) {
    where.symbol = symbol;
  }
  if (betaUserId) {
    where.betaUserId = betaUserId;
  }
  return prisma.recommendation.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

async function getById(id) {
  const prisma = getPrismaClient();
  return prisma.recommendation.findUnique({ where: { id } });
}

async function getActiveForSymbol(symbol) {
  const prisma = getPrismaClient();
  return prisma.recommendation.findFirst({ where: { symbol, status: "ACTIVE" } });
}

/**
 * Marks every other ACTIVE recommendation for a symbol as SUPERSEDED,
 * linking it to the recommendation that replaces it. Uses updateMany
 * (rather than findFirst-then-update) so it's correct even if more than
 * one ACTIVE row exists for the symbol at call time.
 */
// Sprint 42 — now also returns the real ids of every row it actually
// changed (never a fabricated list), so a caller can record a real
// CANCELLED lifecycle event per superseded recommendation.
async function supersedeActiveForSymbol(symbol, newRecommendationId) {
  const prisma = getPrismaClient();
  const where = { symbol, status: "ACTIVE", id: { not: newRecommendationId } };
  const matched = await prisma.recommendation.findMany({ where, select: { id: true } });
  const result = await prisma.recommendation.updateMany({ where, data: { status: "SUPERSEDED", supersededById: newRecommendationId } });
  return { ...result, ids: matched.map((row) => row.id) };
}

// Sprint 29 Priority 1 — the EXPIRED transition, previously schema-only
// (expiresAt existed on the model with no writer anywhere). A stale
// recommendation nobody acted on and that wasn't superseded by a fresher
// one for the same symbol should stop reading as "still active" forever.
// updateMany rather than a per-row loop, matching supersedeActiveForSymbol
// above; a status change, never a delete — history is preserved.
// Sprint 42 — now also returns the real ids of every row it actually
// expired, so a caller can record a real EXPIRED lifecycle event per row.
async function expireStaleRecommendations() {
  const prisma = getPrismaClient();
  const where = { status: "ACTIVE", expiresAt: { lt: new Date() } };
  const matched = await prisma.recommendation.findMany({ where, select: { id: true } });
  const result = await prisma.recommendation.updateMany({ where, data: { status: "EXPIRED" } });
  return { ...result, ids: matched.map((row) => row.id) };
}

async function createRunLog(data) {
  const prisma = getPrismaClient();
  return prisma.autonomousRunLog.create({ data });
}

async function getLatestRunLog() {
  const prisma = getPrismaClient();
  return prisma.autonomousRunLog.findFirst({ orderBy: { startedAt: "desc" } });
}

// Sprint 16 Phase D — DecisionTrace is immutable by convention: this file
// deliberately exposes only create + read for it, never an update, so
// there is no code path anywhere that can mutate a trace after creation.
async function createDecisionTrace(data) {
  const prisma = getPrismaClient();
  return prisma.decisionTrace.create({ data });
}

async function getDecisionTraceByRecommendationId(recommendationId) {
  const prisma = getPrismaClient();
  return prisma.decisionTrace.findUnique({ where: { recommendationId } });
}

// Sprint 29 — Feedback Intelligence Layer, Priority 2. Create-only, like
// DecisionTrace above: no update/delete method exists here, so there is
// no code path that can alter or remove a user's past feedback. A user
// changing their mind creates a new row rather than editing the old one,
// preserving the full evidence trail.
// Phase H2 — betaUserId optional, attributes this feedback to a specific
// beta user without changing the create-only, never-updated contract
// above. Omitted, behaves exactly as before this phase.
async function createFeedback({ recommendationId, feedbackType, betaUserId }) {
  const prisma = getPrismaClient();
  return prisma.recommendationFeedback.create({ data: { recommendationId, feedbackType, betaUserId: betaUserId || null } });
}

async function listFeedbackForRecommendation(recommendationId) {
  const prisma = getPrismaClient();
  return prisma.recommendationFeedback.findMany({ where: { recommendationId }, orderBy: { createdAt: "desc" } });
}

// Sprint 30 — Learning Loop (Priority 3) reads across every recommendation's
// feedback, not just one at a time; includes the parent recommendation's
// symbol so aggregation can group by it without a second round-trip.
// Phase PERSONALIZATION-PRIVACY-001 — betaUserId is optional and additive,
// matching listActive/listAll's existing convention in this same file:
// omitted, this stays the legitimate platform-wide aggregate
// learningLoopService.js and qualityDashboardService.js both intentionally
// rely on (internal/developer visibility, never per-user); passed, it
// scopes to one real user's own feedback — the mode
// investorMemoryService.js now always uses.
async function listAllFeedback({ limit = 500, betaUserId } = {}) {
  const prisma = getPrismaClient();
  return prisma.recommendationFeedback.findMany({
    where: betaUserId ? { betaUserId } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { recommendation: { select: { symbol: true } } },
  });
}

module.exports = {
  createRecommendation,
  listActive,
  listAll,
  getById,
  getActiveForSymbol,
  supersedeActiveForSymbol,
  expireStaleRecommendations,
  createRunLog,
  getLatestRunLog,
  createDecisionTrace,
  getDecisionTraceByRecommendationId,
  createFeedback,
  listFeedbackForRecommendation,
  listAllFeedback,
};
