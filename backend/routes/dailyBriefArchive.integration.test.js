require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const { truncateAll } = require("../test/dbHelpers");
const { getPrismaClient } = require("../db/prismaClient");
const app = require("../app");

test.beforeEach(async () => {
  await truncateAll();
});

test("GET /api/intelligence/daily-brief/archive returns an empty list before any brief is captured", async () => {
  const response = await request(app).get("/api/intelligence/daily-brief/archive");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { briefs: [] });
});

test("GET /api/intelligence/daily-brief/archive returns captured snapshots, newest first", async () => {
  const prisma = getPrismaClient();
  await prisma.dailyBriefSnapshot.create({
    data: { date: "2026-07-10", sessionType: "morning", executiveSummary: "Yesterday's brief.", confidenceScore: 65, topEvent: "Fed rate hike" },
  });
  await prisma.dailyBriefSnapshot.create({
    data: { date: "2026-07-11", sessionType: "morning", executiveSummary: "Today's brief.", confidenceScore: 72, topEvent: "BTC ETF approval" },
  });

  const response = await request(app).get("/api/intelligence/daily-brief/archive");
  assert.equal(response.status, 200);
  assert.equal(response.body.briefs.length, 2);
  assert.equal(response.body.briefs[0].date, "2026-07-11");
  assert.ok(response.body.briefs[0].comparedToPrevious);
});
