const { getPrismaClient } = require("../db/prismaClient");

// Sprint 30 — Personal Intelligence Layer, Priority 1 (User Memory).
// Append-only: this file exposes create + read only, never update or
// delete, so a user's full interaction history accumulates rather than
// being overwritten. "Favorite sectors," "ignored sectors," and "reading
// behavior" are not stored as separate facts — they're all derived, at
// query time, from this one real event stream (see getSectorInterestSummary
// below), so there is never a second, competing source of truth to keep
// in sync.

async function appendEvent({ eventType, subject, sector = null, detail = null }) {
  const prisma = getPrismaClient();
  return prisma.userMemoryEvent.create({
    data: { eventType, subject, sector, detail },
  });
}

async function listEvents({ eventType, limit = 100 } = {}) {
  const prisma = getPrismaClient();
  return prisma.userMemoryEvent.findMany({
    where: eventType ? { eventType } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * "Favorite" is a real, derived signal: sectors the user has actually
 * viewed recommendations for, ranked by how often. "Ignored" is honestly
 * derived too — it only ever names a sector that genuinely had
 * recommendations available (passed in via `candidateSectors`, the real
 * sectors present in the current recommendation universe) but zero
 * view events on record. Never fabricates an "ignored" sector the user
 * was never actually offered.
 */
async function getSectorInterestSummary({ candidateSectors = [] } = {}) {
  const prisma = getPrismaClient();
  const events = await prisma.userMemoryEvent.findMany({
    where: { eventType: "RECOMMENDATION_VIEWED", sector: { not: null } },
    select: { sector: true },
  });

  const viewCounts = new Map();
  for (const event of events) {
    viewCounts.set(event.sector, (viewCounts.get(event.sector) || 0) + 1);
  }

  const favoriteSectors = Array.from(viewCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([sector, viewCount]) => ({ sector, viewCount }));

  const normalizedCandidates = Array.from(new Set(candidateSectors.filter(Boolean)));
  const ignoredSectors = normalizedCandidates.filter((sector) => !viewCounts.has(sector));

  return { favoriteSectors, ignoredSectors };
}

/**
 * Sprint 32 — Investor Memory (Priority 1). Same pattern as
 * getSectorInterestSummary: "favorite themes" is derived purely from real
 * THEME_VIEWED events, ranked by how often, never a fabricated
 * preference.
 */
async function getThemeInterestSummary() {
  const prisma = getPrismaClient();
  const events = await prisma.userMemoryEvent.findMany({
    where: { eventType: "THEME_VIEWED" },
    select: { subject: true },
  });

  const viewCounts = new Map();
  for (const event of events) {
    viewCounts.set(event.subject, (viewCounts.get(event.subject) || 0) + 1);
  }

  const favoriteThemes = Array.from(viewCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([themeKey, viewCount]) => ({ themeKey, viewCount }));

  return { favoriteThemes };
}

async function getRecommendationViewCounts() {
  const prisma = getPrismaClient();
  const events = await prisma.userMemoryEvent.findMany({
    where: { eventType: "RECOMMENDATION_VIEWED" },
    select: { subject: true },
  });

  const counts = new Map();
  for (const event of events) {
    counts.set(event.subject, (counts.get(event.subject) || 0) + 1);
  }
  return counts;
}

module.exports = {
  appendEvent,
  listEvents,
  getSectorInterestSummary,
  getThemeInterestSummary,
  getRecommendationViewCounts,
};
