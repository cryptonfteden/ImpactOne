const { getPrismaClient } = require("../db/prismaClient");

// Sprint 35 Priority 5 — pure persistence, no interpretation. Whatever
// shape validation/allowlisting happens (analyticsService.js), this file
// just writes and reads AnalyticsEvent rows. Phase H2 adds an optional
// betaUserId (nullable, per the approved F2 design) for per-beta-user
// attribution during the closed beta — omitted, behaves exactly as
// before this phase (anonymous, sessionId-only).
async function createEvent({ eventName, properties, sessionId, betaUserId, screen, durationMs }) {
  const prisma = getPrismaClient();
  return prisma.analyticsEvent.create({
    data: {
      eventName,
      properties: properties || {},
      sessionId: sessionId || null,
      betaUserId: betaUserId || null,
      screen: screen || null,
      durationMs: durationMs ?? null,
    },
  });
}

async function countByEventName() {
  const prisma = getPrismaClient();
  const rows = await prisma.analyticsEvent.groupBy({
    by: ["eventName"],
    _count: { _all: true },
  });
  return rows.map((row) => ({ eventName: row.eventName, count: row._count._all }));
}

// Sprint 36 — Time To Value measurement. Every event that carries a real
// sessionId, oldest first, so ttvMetricsService can walk each session's
// own timeline and compute "time from this session's first_open to its
// first occurrence of event X" without needing a SQL window function per
// metric.
async function listEventsWithSession() {
  const prisma = getPrismaClient();
  return prisma.analyticsEvent.findMany({
    where: { sessionId: { not: null } },
    orderBy: { createdAt: "asc" },
    select: { eventName: true, sessionId: true, createdAt: true },
  });
}

// Phase X9 — Part 5, Admin Dashboard: "Most Used Screens."
async function countByScreen() {
  const prisma = getPrismaClient();
  const rows = await prisma.analyticsEvent.groupBy({
    by: ["screen"],
    where: { screen: { not: null } },
    _count: { _all: true },
  });
  return rows.map((row) => ({ screen: row.screen, count: row._count._all })).sort((a, b) => b.count - a.count);
}

// Phase X9 — Part 5. Distinct real betaUserId/sessionId active in the
// last N days — the two real, honest proxies for "Daily Active Users"
// (a beta user's own identity when resolved, their anonymous session
// otherwise — never double-counted against each other, reported as two
// separate, real numbers rather than one blended guess).
async function countActiveInWindow({ days = 1 } = {}) {
  const prisma = getPrismaClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const [users, sessions] = await Promise.all([
    prisma.analyticsEvent.findMany({ where: { createdAt: { gte: since }, betaUserId: { not: null } }, distinct: ["betaUserId"], select: { betaUserId: true } }),
    prisma.analyticsEvent.findMany({ where: { createdAt: { gte: since }, sessionId: { not: null } }, distinct: ["sessionId"], select: { sessionId: true } }),
  ]);
  return { distinctBetaUsers: users.length, distinctSessions: sessions.length };
}

// Phase X9 — Part 5. Real symbol counts for a specific event's
// properties.symbol — used for "Top Recommendations Viewed." Reads and
// tallies in JS since `properties` is a JSON column, not a queryable
// SQL column.
async function countSymbolPropertyForEvent(eventName, { limit = 10 } = {}) {
  const prisma = getPrismaClient();
  const rows = await prisma.analyticsEvent.findMany({ where: { eventName }, select: { properties: true } });
  const counts = new Map();
  for (const row of rows) {
    const symbol = row.properties?.symbol;
    if (typeof symbol !== "string") continue;
    counts.set(symbol, (counts.get(symbol) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([symbol, count]) => ({ symbol, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

module.exports = { createEvent, countByEventName, listEventsWithSession, countByScreen, countActiveInWindow, countSymbolPropertyForEvent };
