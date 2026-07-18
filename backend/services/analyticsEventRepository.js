const { getPrismaClient } = require("../db/prismaClient");

// Sprint 35 Priority 5 — pure persistence, no interpretation. Whatever
// shape validation/allowlisting happens (analyticsService.js), this file
// just writes and reads AnalyticsEvent rows — genuinely anonymous, no
// user/profile identifier column exists on the table at all.
async function createEvent({ eventName, properties }) {
  const prisma = getPrismaClient();
  return prisma.analyticsEvent.create({
    data: { eventName, properties: properties || {} },
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

module.exports = { createEvent, countByEventName };
