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

test("recordEvent stores no user/profile identifier — the table has no such column to begin with", async () => {
  await analyticsService.recordEvent({ eventName: "returning_user", properties: {} });

  const prisma = getPrismaClient();
  const [row] = await prisma.analyticsEvent.findMany();
  const keys = Object.keys(row);
  assert.deepEqual(keys.sort(), ["createdAt", "eventName", "id", "properties"].sort());
});
