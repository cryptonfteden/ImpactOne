const { getPrismaClient } = require("../db/prismaClient");

/**
 * Sprint 21A. Persists one row per canonical event, keyed by
 * deduplicationKey. Uses createMany({ skipDuplicates: true }) — a real
 * DB-level ON CONFLICT DO NOTHING against the unique constraint on
 * deduplicationKey, not app-level create-then-catch — so two providers (or
 * two runs of the same provider) racing on the same underlying evidence
 * never produce two rows, and the caller learns whether the row was new
 * without a separate existence check.
 */
async function upsertIfNew(envelope, { providerId }) {
  const prisma = getPrismaClient();
  const result = await prisma.canonicalEvent.createMany({
    data: [
      {
        providerId,
        eventType: envelope.eventType,
        sourceType: envelope.sourceType,
        sourceName: envelope.sourceName,
        sourceUrl: envelope.sourceUrl,
        publishedAt: envelope.publishedAt ? new Date(envelope.publishedAt) : null,
        ingestedAt: envelope.ingestedAt ? new Date(envelope.ingestedAt) : new Date(),
        entities: envelope.entities || [],
        symbols: envelope.symbols || [],
        sectors: envelope.sectors || [],
        countries: envelope.countries || [],
        companies: envelope.companies || [],
        themes: envelope.themes || [],
        language: envelope.language || "en",
        region: envelope.region || null,
        category: envelope.category || envelope.eventType,
        summary: envelope.summary || "",
        rawReference: envelope.rawReference ?? null,
        credibilityScore: Number.isFinite(envelope.credibilityScore) ? envelope.credibilityScore : null,
        freshnessScore: Number.isFinite(envelope.freshnessScore) ? envelope.freshnessScore : null,
        relevanceScore: Number.isFinite(envelope.relevanceScore) ? envelope.relevanceScore : null,
        confidence: Number.isFinite(envelope.confidence) ? envelope.confidence : null,
        provenance: envelope.provenance ?? null,
        deduplicationKey: envelope.deduplicationKey,
      },
    ],
    skipDuplicates: true,
  });
  return { isNew: result.count === 1 };
}

async function findByDeduplicationKey(deduplicationKey) {
  const prisma = getPrismaClient();
  return prisma.canonicalEvent.findUnique({ where: { deduplicationKey } });
}

async function listRecent({ providerId, limit = 50 } = {}) {
  const prisma = getPrismaClient();
  return prisma.canonicalEvent.findMany({
    where: providerId ? { providerId } : undefined,
    orderBy: { ingestedAt: "desc" },
    take: limit,
  });
}

module.exports = { upsertIfNew, findByDeduplicationKey, listRecent };
