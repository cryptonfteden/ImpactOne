const { getPrismaClient } = require("../db/prismaClient");

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

async function upsertTodaySnapshot({ themeKey, confidenceScore, maturityLabel }) {
  const prisma = getPrismaClient();
  const date = todayDateString();
  return prisma.themeConfidenceSnapshot.upsert({
    where: { themeKey_date: { themeKey, date } },
    update: { confidenceScore, maturityLabel },
    create: { themeKey, date, confidenceScore, maturityLabel },
  });
}

async function getRecentSnapshots(themeKey, limit = 30) {
  const prisma = getPrismaClient();
  return prisma.themeConfidenceSnapshot.findMany({
    where: { themeKey },
    orderBy: { date: "desc" },
    take: limit,
  });
}

module.exports = { upsertTodaySnapshot, getRecentSnapshots, todayDateString };
