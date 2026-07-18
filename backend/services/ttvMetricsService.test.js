require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const { getPrismaClient } = require("../db/prismaClient");
const ttvMetricsService = require("./ttvMetricsService");

test.beforeEach(async () => {
  await truncateAll();
});

async function seedEvent(eventName, sessionId, createdAt) {
  const prisma = getPrismaClient();
  await prisma.analyticsEvent.create({ data: { eventName, sessionId, properties: {}, createdAt } });
}

test("computeTimeToValueMetrics is honestly empty when no sessions exist", async () => {
  const result = await ttvMetricsService.computeTimeToValueMetrics();
  assert.equal(result.totalSessions, 0);
  assert.equal(result.metrics.morning_brief_read.sampleSize, 0);
  assert.equal(result.metrics.morning_brief_read.medianSeconds, null);
});

test("computeTimeToValueMetrics measures the real delta between first_open and a milestone for one session", async () => {
  const sessionId = "11111111-1111-4111-8111-111111111111";
  const start = new Date("2026-07-18T09:00:00.000Z");
  await seedEvent("first_open", sessionId, start);
  await seedEvent("morning_brief_read", sessionId, new Date(start.getTime() + 30000)); // +30s

  const result = await ttvMetricsService.computeTimeToValueMetrics();
  assert.equal(result.totalSessions, 1);
  assert.equal(result.metrics.morning_brief_read.sampleSize, 1);
  assert.equal(result.metrics.morning_brief_read.medianSeconds, 30);
  assert.equal(result.metrics.morning_brief_read.averageSeconds, 30);
});

test("computeTimeToValueMetrics uses the FIRST occurrence of a milestone per session, not a later repeat", async () => {
  const sessionId = "22222222-2222-4222-8222-222222222222";
  const start = new Date("2026-07-18T09:00:00.000Z");
  await seedEvent("first_open", sessionId, start);
  await seedEvent("recommendation_viewed", sessionId, new Date(start.getTime() + 10000)); // +10s, first
  await seedEvent("recommendation_viewed", sessionId, new Date(start.getTime() + 90000)); // +90s, second (ignored)

  const result = await ttvMetricsService.computeTimeToValueMetrics();
  assert.equal(result.metrics.recommendation_viewed.medianSeconds, 10);
});

test("computeTimeToValueMetrics excludes a session from a milestone it never reached, rather than fabricating a value", async () => {
  const sessionId = "33333333-3333-4333-8333-333333333333";
  await seedEvent("first_open", sessionId, new Date("2026-07-18T09:00:00.000Z"));
  // No recommendation_understood event for this session at all.

  const result = await ttvMetricsService.computeTimeToValueMetrics();
  assert.equal(result.metrics.recommendation_understood.sampleSize, 0);
  assert.equal(result.metrics.recommendation_understood.medianSeconds, null);
});

test("computeTimeToValueMetrics ignores a session with no first_open at all — no reference point to measure from", async () => {
  const sessionId = "44444444-4444-4444-8444-444444444444";
  await seedEvent("morning_brief_read", sessionId, new Date("2026-07-18T09:00:00.000Z"));

  const result = await ttvMetricsService.computeTimeToValueMetrics();
  assert.equal(result.metrics.morning_brief_read.sampleSize, 0);
});

test("computeTimeToValueMetrics computes a real median across multiple sessions", async () => {
  const start = new Date("2026-07-18T09:00:00.000Z");
  const sessions = [
    { id: "55555555-5555-4555-8555-555555555551", deltaMs: 10000 },
    { id: "55555555-5555-4555-8555-555555555552", deltaMs: 20000 },
    { id: "55555555-5555-4555-8555-555555555553", deltaMs: 60000 },
  ];
  for (const session of sessions) {
    await seedEvent("first_open", session.id, start);
    await seedEvent("morning_brief_read", session.id, new Date(start.getTime() + session.deltaMs));
  }

  const result = await ttvMetricsService.computeTimeToValueMetrics();
  assert.equal(result.metrics.morning_brief_read.sampleSize, 3);
  assert.equal(result.metrics.morning_brief_read.medianSeconds, 20);
  assert.equal(result.metrics.morning_brief_read.averageSeconds, 30);
});
