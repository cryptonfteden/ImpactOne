require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const { getPrismaClient } = require("../db/prismaClient");
const analyticsService = require("./analyticsService");

test.beforeEach(async () => {
  await truncateAll();
});

test("recordEvent persists a real row for an allowlisted event", async () => {
  await analyticsService.recordEvent({ eventName: "morning_brief_read", properties: {} });

  const prisma = getPrismaClient();
  const rows = await prisma.analyticsEvent.findMany();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].eventName, "morning_brief_read");
});

test("recordEvent rejects an event name outside the fixed allowlist", async () => {
  await assert.rejects(
    () => analyticsService.recordEvent({ eventName: "some_random_event", properties: {} }),
    /Unknown analytics event/
  );

  const prisma = getPrismaClient();
  const rows = await prisma.analyticsEvent.findMany();
  assert.equal(rows.length, 0);
});

test("recordEvent strips any property key outside the allowlist, never persisting it", async () => {
  await analyticsService.recordEvent({
    eventName: "recommendation_viewed",
    properties: { symbol: "NVDA", action: "BUY", age: 34, email: "test@example.com" },
  });

  const prisma = getPrismaClient();
  const [row] = await prisma.analyticsEvent.findMany();
  assert.deepEqual(row.properties, { symbol: "NVDA", action: "BUY" });
  assert.equal("age" in row.properties, false);
  assert.equal("email" in row.properties, false);
});

test("recordEvent drops a non-primitive property value rather than storing an unexpected nested object", async () => {
  await analyticsService.recordEvent({
    eventName: "recommendation_expanded",
    properties: { symbol: "NVDA", cardKey: { nested: "object" } },
  });

  const prisma = getPrismaClient();
  const [row] = await prisma.analyticsEvent.findMany();
  assert.deepEqual(row.properties, { symbol: "NVDA" });
});

test("recordEvent stores no user/profile identifier — sessionId is a random correlation token, not identifying, and every other column is anonymous by construction", async () => {
  await analyticsService.recordEvent({ eventName: "returning_user", properties: {} });

  const prisma = getPrismaClient();
  const [row] = await prisma.analyticsEvent.findMany();
  const keys = Object.keys(row);
  assert.deepEqual(keys.sort(), ["createdAt", "eventName", "id", "properties", "sessionId"].sort());
});

test("Sprint 36 — recordEvent stores a valid UUID sessionId", async () => {
  const sessionId = "11111111-2222-4333-8444-555555555555";
  await analyticsService.recordEvent({ eventName: "first_open", properties: {}, sessionId });

  const prisma = getPrismaClient();
  const [row] = await prisma.analyticsEvent.findMany();
  assert.equal(row.sessionId, sessionId);
});

test("Sprint 36 — recordEvent silently drops a non-UUID sessionId rather than storing arbitrary data in that column", async () => {
  await analyticsService.recordEvent({ eventName: "first_open", properties: {}, sessionId: "not-a-real-uuid; DROP TABLE" });

  const prisma = getPrismaClient();
  const [row] = await prisma.analyticsEvent.findMany();
  assert.equal(row.sessionId, null);
});

test("Sprint 36 — first_useful_information and recommendation_understood are allowlisted events", async () => {
  await analyticsService.recordEvent({ eventName: "first_useful_information", properties: {} });
  await analyticsService.recordEvent({ eventName: "recommendation_understood", properties: { symbol: "NVDA" } });

  const prisma = getPrismaClient();
  const rows = await prisma.analyticsEvent.findMany();
  assert.equal(rows.length, 2);
});
