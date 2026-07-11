require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const { getPrismaClient } = require("../db/prismaClient");
const archiveService = require("./dailyBriefArchiveService");

test.beforeEach(async () => {
  await truncateAll();
});

test("compareSnapshots: first-ever entry has no previous to compare against", () => {
  const result = archiveService.compareSnapshots({ topEvent: "Fed rate hike", confidenceScore: 70 }, null);
  assert.equal(result, "Earliest entry in the archive.");
});

test("compareSnapshots: reports a top-event shift", () => {
  const result = archiveService.compareSnapshots(
    { topEvent: "BTC ETF approval", confidenceScore: 70 },
    { topEvent: "Fed rate hike", confidenceScore: 70 }
  );
  assert.match(result, /Top event shifted from "Fed rate hike" to "BTC ETF approval"/);
});

test("compareSnapshots: reports a meaningful confidence delta", () => {
  const result = archiveService.compareSnapshots(
    { topEvent: "Fed rate hike", confidenceScore: 82 },
    { topEvent: "Fed rate hike", confidenceScore: 70 }
  );
  assert.match(result, /Confidence rose 12 points/);
});

test("compareSnapshots: reports no material change when nothing moved", () => {
  const result = archiveService.compareSnapshots(
    { topEvent: "Fed rate hike", confidenceScore: 70.2 },
    { topEvent: "Fed rate hike", confidenceScore: 70 }
  );
  assert.equal(result, "No material change vs. the prior entry.");
});

test("captureTodaySnapshot upserts one row per day, getArchive returns it", async () => {
  await archiveService.captureTodaySnapshot({
    sessionType: "morning",
    aiSummary: { executiveSummary: "First cut of the day.", confidenceScore: 60 },
    topMarketMovingEvents: [{ event: "Fed rate hike" }],
  });

  await archiveService.captureTodaySnapshot({
    sessionType: "morning",
    aiSummary: { executiveSummary: "Updated later in the day.", confidenceScore: 75 },
    topMarketMovingEvents: [{ event: "BTC ETF approval" }],
  });

  const archive = await archiveService.getArchive();
  assert.equal(archive.length, 1, "same-day captures should upsert, not accumulate rows");
  assert.equal(archive[0].executiveSummary, "Updated later in the day.");
  assert.equal(archive[0].confidenceScore, 75);
  assert.equal(archive[0].topEvent, "BTC ETF approval");
});

test("getArchive decorates each entry with a comparison to the next-older one", async () => {
  const prisma = getPrismaClient();
  await prisma.dailyBriefSnapshot.create({
    data: { date: "2026-07-09", sessionType: "morning", executiveSummary: "Two days ago.", confidenceScore: 60, topEvent: "Oil spike" },
  });
  await prisma.dailyBriefSnapshot.create({
    data: { date: "2026-07-10", sessionType: "morning", executiveSummary: "Yesterday.", confidenceScore: 68, topEvent: "Fed rate hike" },
  });

  const archive = await archiveService.getArchive();
  assert.equal(archive.length, 2);
  assert.equal(archive[0].date, "2026-07-10");
  assert.match(archive[0].comparedToPrevious, /Top event shifted from "Oil spike" to "Fed rate hike"/);
  assert.equal(archive[1].comparedToPrevious, "Earliest entry in the archive.");
});
