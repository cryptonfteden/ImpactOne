const { getPrismaClient } = require("../db/prismaClient");

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

async function upsertTodaySnapshot({ sessionType, executiveSummary, confidenceScore, topEvent }) {
  const prisma = getPrismaClient();
  const date = todayDateString();
  return prisma.dailyBriefSnapshot.upsert({
    where: { date },
    update: { sessionType, executiveSummary, confidenceScore, topEvent: topEvent || null },
    create: { date, sessionType, executiveSummary, confidenceScore, topEvent: topEvent || null },
  });
}

async function getRecentSnapshots(limit = 7) {
  const prisma = getPrismaClient();
  return prisma.dailyBriefSnapshot.findMany({
    orderBy: { date: "desc" },
    take: limit,
  });
}

module.exports = { upsertTodaySnapshot, getRecentSnapshots, todayDateString };
