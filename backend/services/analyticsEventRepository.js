const { getPrismaClient } = require("../db/prismaClient");

// Sprint 35 Priority 5 — pure persistence, no interpretation. Whatever
// shape validation/allowlisting happens (analyticsService.js), this file
// just writes and reads AnalyticsEvent rows — genuinely anonymous, no
// user/profile identifier column exists on the table at all.
async function createEvent({ eventName, properties, sessionId }) {
  const prisma = getPrismaClient();
  return prisma.analyticsEvent.create({
    data: { eventName, properties: properties || {}, sessionId: sessionId || null },
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

module.exports = { createEvent, countByEventName, listEventsWithSession };
