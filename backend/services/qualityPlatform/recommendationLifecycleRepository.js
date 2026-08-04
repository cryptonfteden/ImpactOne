// Sprint 42 — Recommendation Lifecycle. All raw Prisma access for
// RecommendationLifecycleEvent lives here, mirroring this codebase's
// existing repository convention. Append-only: this file exposes create +
// read only, never an update/delete, so a recommendation's lifecycle can
// never be rewritten after the fact.
const { getPrismaClient } = require("../../db/prismaClient");

async function recordTransition({ recommendationId, state, metadata = null, occurredAt } = {}) {
  const prisma = getPrismaClient();
  return prisma.recommendationLifecycleEvent.create({
    data: { recommendationId, state, metadata, ...(occurredAt ? { occurredAt } : {}) },
  });
}

async function listForRecommendation(recommendationId) {
  const prisma = getPrismaClient();
  return prisma.recommendationLifecycleEvent.findMany({
    where: { recommendationId },
    orderBy: { occurredAt: "asc" },
  });
}

module.exports = { recordTransition, listForRecommendation };
