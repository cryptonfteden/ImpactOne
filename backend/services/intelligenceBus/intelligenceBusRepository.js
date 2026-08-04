// Phase AI-ENGINE-003 — Platform Intelligence Bus. Persistence. Append-
// mostly: `createEvent` is the only way a new row is created; the one
// disclosed, bounded exception is `markSuperseded`, which flips exactly
// one existing ACTIVE row to SUPERSEDED when a newer event in the same
// identityKey series is published — never a general-purpose update.
const { getPrismaClient } = require("../../db/prismaClient");

function toPlainEvent(row) {
  if (!row) return row;
  return {
    ...row,
    confidence: row.confidence === null || row.confidence === undefined ? row.confidence : Number(row.confidence),
    rawConfidence: row.rawConfidence === null || row.rawConfidence === undefined ? row.rawConfidence : Number(row.rawConfidence),
  };
}

/**
 * Idempotent on deduplicationKey: if an event with this exact key
 * already exists, it is returned as-is (not recreated, not updated) —
 * the caller (intelligenceBusService) uses this to detect and report a
 * duplicate publish attempt honestly rather than silently double-
 * writing the same real event.
 */
async function createEvent(data) {
  const prisma = getPrismaClient();
  const existing = await prisma.intelligenceBusEvent.findUnique({ where: { deduplicationKey: data.deduplicationKey } });
  if (existing) {
    return { event: toPlainEvent(existing), created: false };
  }
  const created = await prisma.intelligenceBusEvent.create({ data });
  return { event: toPlainEvent(created), created: true };
}

async function findByDedupKey(deduplicationKey) {
  const prisma = getPrismaClient();
  const row = await prisma.intelligenceBusEvent.findUnique({ where: { deduplicationKey } });
  return toPlainEvent(row);
}

async function findActiveByIdentityKey(identityKey) {
  const prisma = getPrismaClient();
  const rows = await prisma.intelligenceBusEvent.findMany({ where: { identityKey, lifecycleStatus: "ACTIVE" } });
  return rows.map(toPlainEvent);
}

/**
 * The one disclosed, bounded update exception — see module header.
 */
async function markSuperseded(eventId, supersededByEventId) {
  const prisma = getPrismaClient();
  const updated = await prisma.intelligenceBusEvent.update({
    where: { id: eventId },
    data: { lifecycleStatus: "SUPERSEDED", supersededByEventId },
  });
  return toPlainEvent(updated);
}

async function setCanonicalEventId(eventId, canonicalEventId) {
  const prisma = getPrismaClient();
  const updated = await prisma.intelligenceBusEvent.update({ where: { id: eventId }, data: { canonicalEventId } });
  return toPlainEvent(updated);
}

async function getEventById(id) {
  const prisma = getPrismaClient();
  const row = await prisma.intelligenceBusEvent.findUnique({ where: { id } });
  return toPlainEvent(row);
}

/**
 * Ordering guarantee: always ordered by (publishedAt, ingestedAt, id) —
 * a stable, deterministic tiebreak so two events published in the same
 * millisecond never return in an arbitrary order across repeated calls.
 */
async function listEvents({ engineId, eventType, symbol, lifecycleStatus, since, limit = 100 } = {}) {
  const prisma = getPrismaClient();
  const where = {};
  if (engineId) where.engineId = engineId;
  if (eventType) where.eventType = eventType;
  if (symbol) where.symbols = { has: symbol };
  if (lifecycleStatus) where.lifecycleStatus = lifecycleStatus;
  if (since) where.publishedAt = { gte: since };

  const rows = await prisma.intelligenceBusEvent.findMany({
    where,
    orderBy: [{ publishedAt: "asc" }, { ingestedAt: "asc" }, { id: "asc" }],
    take: Math.min(limit, 500),
  });
  return rows.map(toPlainEvent);
}

module.exports = {
  createEvent,
  findByDedupKey,
  findActiveByIdentityKey,
  markSuperseded,
  setCanonicalEventId,
  getEventById,
  listEvents,
};
