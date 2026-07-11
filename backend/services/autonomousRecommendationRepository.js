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

module.exports = {
  createRecommendation,
  listActive,
  listAll,
  getById,
  getActiveForSymbol,
  supersedeActiveForSymbol,
  createRunLog,
  getLatestRunLog,
  createDecisionTrace,
  getDecisionTraceByRecommendationId,
};
