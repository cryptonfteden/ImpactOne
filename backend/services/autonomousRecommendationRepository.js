const { getPrismaClient } = require("../db/prismaClient");

// All raw Prisma access for the Recommendation/AutonomousRunLog domain
// lives in this file, mirroring portfolioRepository.js's role.

async function createRecommendation(data) {
  const prisma = getPrismaClient();
  return prisma.recommendation.create({ data });
}

async function listActive({ limit = 50 } = {}) {
  const prisma = getPrismaClient();
  return prisma.recommendation.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

async function listAll({ status, symbol, limit = 100 } = {}) {
  const prisma = getPrismaClient();
  const where = {};
  if (status) {
    where.status = status;
  }
  if (symbol) {
    where.symbol = symbol;
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
async function supersedeActiveForSymbol(symbol, newRecommendationId) {
  const prisma = getPrismaClient();
  return prisma.recommendation.updateMany({
    where: { symbol, status: "ACTIVE", id: { not: newRecommendationId } },
    data: { status: "SUPERSEDED", supersededById: newRecommendationId },
  });
}

// Sprint 29 Priority 1 — the EXPIRED transition, previously schema-only
// (expiresAt existed on the model with no writer anywhere). A stale
// recommendation nobody acted on and that wasn't superseded by a fresher
// one for the same symbol should stop reading as "still active" forever.
// updateMany rather than a per-row loop, matching supersedeActiveForSymbol
// above; a status change, never a delete — history is preserved.
async function expireStaleRecommendations() {
  const prisma = getPrismaClient();
  return prisma.recommendation.updateMany({
    where: { status: "ACTIVE", expiresAt: { lt: new Date() } },
    data: { status: "EXPIRED" },
  });
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
async function createFeedback({ recommendationId, feedbackType }) {
  const prisma = getPrismaClient();
  return prisma.recommendationFeedback.create({ data: { recommendationId, feedbackType } });
}

async function listFeedbackForRecommendation(recommendationId) {
  const prisma = getPrismaClient();
  return prisma.recommendationFeedback.findMany({ where: { recommendationId }, orderBy: { createdAt: "desc" } });
}

// Sprint 30 — Learning Loop (Priority 3) reads across every recommendation's
// feedback, not just one at a time; includes the parent recommendation's
// symbol so aggregation can group by it without a second round-trip.
async function listAllFeedback({ limit = 500 } = {}) {
  const prisma = getPrismaClient();
  return prisma.recommendationFeedback.findMany({
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
