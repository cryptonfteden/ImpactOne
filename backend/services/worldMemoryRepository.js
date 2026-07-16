const { getPrismaClient } = require("../db/prismaClient");

/**
 * Sprint 21B — World Memory persistence. Every function below is a
 * create-only append. Nothing in this file calls .update() or .delete() on
 * any World Memory table — immutability here is a property of this file's
 * API surface, not just a documented convention. Where understanding of
 * the past changes, callers create a NEW row referencing the one it
 * supersedes (see appendLesson's supersedesId) rather than editing history.
 */

async function createRecord({ canonicalEventId, occurredAt, primaryThemeKey, symbols, sectors, headline }) {
  const prisma = getPrismaClient();
  return prisma.worldMemoryRecord.create({
    data: {
      canonicalEventId: canonicalEventId || null,
      occurredAt,
      primaryThemeKey: primaryThemeKey || null,
      symbols: symbols || [],
      sectors: sectors || [],
      headline,
    },
  });
}

async function appendCausalLink({ effectRecordId, causeRecordId, explanation, confidence, methodologyVersion }) {
  const prisma = getPrismaClient();
  return prisma.worldMemoryCausalLink.create({
    data: {
      effectRecordId,
      causeRecordId: causeRecordId || null,
      explanation,
      confidence,
      methodologyVersion,
    },
  });
}

async function appendStateChange({ worldMemoryRecordId, dimension, beforeValue, afterValue, methodologyVersion }) {
  const prisma = getPrismaClient();
  return prisma.worldMemoryStateChange.create({
    data: {
      worldMemoryRecordId,
      dimension,
      beforeValue: beforeValue ?? null,
      afterValue: afterValue ?? null,
      methodologyVersion,
    },
  });
}

async function createPrediction({ worldMemoryRecordId, recommendationId, decisionTraceId, predictedAction, predictedConfidence }) {
  const prisma = getPrismaClient();
  return prisma.worldMemoryPrediction.create({
    data: {
      worldMemoryRecordId,
      recommendationId: recommendationId || null,
      decisionTraceId: decisionTraceId || null,
      predictedAction,
      predictedConfidence,
    },
  });
}

async function createOutcome(data) {
  const prisma = getPrismaClient();
  return prisma.outcome.create({ data });
}

async function listOutcomesForRecord(worldMemoryPredictionId) {
  const prisma = getPrismaClient();
  return prisma.outcome.findMany({ where: { worldMemoryPredictionId }, orderBy: { gradedAt: "desc" } });
}

/**
 * Assigns the next revisionNumber for themeKey inside the function itself
 * (never caller-supplied), and retries on a unique-constraint collision
 * (themeKey, revisionNumber) so two concurrent callers can race without
 * ever producing a duplicate or silently-lost revision.
 */
async function appendThesisRevision({ themeKey, newThesis, triggeringRecordId }) {
  const prisma = getPrismaClient();
  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const previous = await prisma.worldMemoryThesisRevision.findFirst({
      where: { themeKey },
      orderBy: { revisionNumber: "desc" },
    });
    const revisionNumber = previous ? previous.revisionNumber + 1 : 1;

    try {
      return await prisma.worldMemoryThesisRevision.create({
        data: {
          themeKey,
          revisionNumber,
          previousThesis: previous ? previous.newThesis : null,
          newThesis,
          triggeringRecordId: triggeringRecordId || null,
        },
      });
    } catch (error) {
      const isRevisionCollision = error.code === "P2002";
      if (isRevisionCollision && attempt < maxAttempts) continue;
      throw error;
    }
  }
}

async function getLatestThesisRevision(themeKey) {
  const prisma = getPrismaClient();
  return prisma.worldMemoryThesisRevision.findFirst({
    where: { themeKey },
    orderBy: { revisionNumber: "desc" },
  });
}

/**
 * Sprint 24 — Home's "what changed in the platform's beliefs" reads this:
 * every thesis revision across all themes written within the lookback
 * window, newest first. A real, sourced answer, not a fabricated one — if
 * nothing changed, this honestly returns an empty array.
 */
async function listRecentThesisRevisions({ since, limit = 20 } = {}) {
  const prisma = getPrismaClient();
  return prisma.worldMemoryThesisRevision.findMany({
    where: since ? { changedAt: { gte: since } } : undefined,
    orderBy: { changedAt: "desc" },
    take: limit,
  });
}

async function appendSectorImpact({ worldMemoryRecordId, sector, direction, magnitude, rationale }) {
  const prisma = getPrismaClient();
  return prisma.worldMemorySectorImpact.create({
    data: { worldMemoryRecordId, sector, direction, magnitude, rationale },
  });
}

async function appendLesson({ worldMemoryRecordId, outcomeId, lessonText, supersedesId, methodologyVersion }) {
  const prisma = getPrismaClient();

  if (supersedesId) {
    const target = await prisma.worldMemoryLesson.findUnique({ where: { id: supersedesId } });
    if (!target) {
      throw new Error(`appendLesson: supersedesId "${supersedesId}" does not reference an existing lesson`);
    }
  }

  return prisma.worldMemoryLesson.create({
    data: {
      worldMemoryRecordId: worldMemoryRecordId || null,
      outcomeId: outcomeId || null,
      lessonText,
      supersedesId: supersedesId || null,
      methodologyVersion,
    },
  });
}

/**
 * One aggregate read joining the spine to all six satellites — "tell me
 * everything World Memory knows about this occurrence," the natural query
 * shape for a permanent, years-scale record.
 */
async function getRecordWithHistory(worldMemoryRecordId) {
  const prisma = getPrismaClient();
  const record = await prisma.worldMemoryRecord.findUnique({ where: { id: worldMemoryRecordId } });
  if (!record) return null;

  const [causalLinks, stateChanges, predictions, sectorImpacts, lessons] = await Promise.all([
    prisma.worldMemoryCausalLink.findMany({ where: { effectRecordId: worldMemoryRecordId } }),
    prisma.worldMemoryStateChange.findMany({ where: { worldMemoryRecordId } }),
    prisma.worldMemoryPrediction.findMany({ where: { worldMemoryRecordId } }),
    prisma.worldMemorySectorImpact.findMany({ where: { worldMemoryRecordId } }),
    prisma.worldMemoryLesson.findMany({ where: { worldMemoryRecordId } }),
  ]);

  return { record, causalLinks, stateChanges, predictions, sectorImpacts, lessons };
}

/**
 * Sprint 29 — Feedback Intelligence Layer, Priority 1. Finds predictions
 * old enough to grade that don't already have a graded Outcome for the
 * given timeWindow. Two queries rather than a single join (Prisma has no
 * anti-join), acceptable at this table's real volume; filters in JS.
 */
async function listPredictionsPendingOutcome({ olderThan, timeWindow = "D1" } = {}) {
  const prisma = getPrismaClient();
  const predictions = await prisma.worldMemoryPrediction.findMany({
    where: { recommendationId: { not: null }, predictedAt: { lte: olderThan } },
  });
  if (!predictions.length) {
    return [];
  }

  const recommendationIds = predictions.map((prediction) => prediction.recommendationId);
  const gradedOutcomes = await prisma.outcome.findMany({
    where: { recommendationId: { in: recommendationIds }, timeWindow },
    select: { recommendationId: true },
  });
  const gradedSet = new Set(gradedOutcomes.map((outcome) => outcome.recommendationId));
  return predictions.filter((prediction) => !gradedSet.has(prediction.recommendationId));
}

/**
 * Sprint 31 — Outcome Intelligence (Priority 4). Finds graded outcomes
 * (any real grade, including UNGRADEABLE — even "we couldn't grade this"
 * is itself a lesson worth recording) that don't already have a lesson,
 * so the generator never writes a duplicate for the same outcome. Two
 * queries rather than a join, same pattern as
 * listPredictionsPendingOutcome above.
 */
async function listOutcomesWithoutLesson({ limit = 100 } = {}) {
  const prisma = getPrismaClient();
  const outcomes = await prisma.outcome.findMany({ orderBy: { gradedAt: "desc" }, take: limit });
  if (!outcomes.length) {
    return [];
  }

  const outcomeIds = outcomes.map((outcome) => outcome.id);
  const existingLessons = await prisma.worldMemoryLesson.findMany({
    where: { outcomeId: { in: outcomeIds } },
    select: { outcomeId: true },
  });
  const lessonedSet = new Set(existingLessons.map((lesson) => lesson.outcomeId));
  return outcomes.filter((outcome) => !lessonedSet.has(outcome.id));
}

async function listRecentLessons({ limit = 20 } = {}) {
  const prisma = getPrismaClient();
  return prisma.worldMemoryLesson.findMany({ orderBy: { generatedAt: "desc" }, take: limit });
}

module.exports = {
  createRecord,
  appendCausalLink,
  appendStateChange,
  createPrediction,
  createOutcome,
  listOutcomesForRecord,
  listPredictionsPendingOutcome,
  appendThesisRevision,
  getLatestThesisRevision,
  listRecentThesisRevisions,
  appendSectorImpact,
  appendLesson,
  listOutcomesWithoutLesson,
  listRecentLessons,
  getRecordWithHistory,
};
