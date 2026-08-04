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

test("recordEvent stores no user/profile identifier beyond the anonymous sessionId and the optional Phase H2 betaUserId — no unexpected column", async () => {
  await analyticsService.recordEvent({ eventName: "returning_user", properties: {} });

  const prisma = getPrismaClient();
  const [row] = await prisma.analyticsEvent.findMany();
  const keys = Object.keys(row);
  assert.deepEqual(keys.sort(), ["betaUserId", "createdAt", "durationMs", "eventName", "id", "properties", "screen", "sessionId"].sort());
  // Omitted here, so it must be honestly null — never fabricated.
  assert.equal(row.betaUserId, null);
});

// Phase H2 — Beta User Isolation. When a betaUserId is resolved (real
// closed-beta session), it's attributed on the event; still never
// resolvable to a real name/email, only to the founder-issued invite
// code that created the BetaUser row.
test("Phase H2 — recordEvent stores a real betaUserId when one is provided", async () => {
  await analyticsService.recordEvent({ eventName: "returning_user", properties: {}, betaUserId: "beta-user-test-id" });

  const prisma = getPrismaClient();
  const [row] = await prisma.analyticsEvent.findMany();
  assert.equal(row.betaUserId, "beta-user-test-id");
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

// Phase X9 — Part 1, Product Analytics. Every event in the mission's
// required catalog must be allowlisted for real, not just documented.
test("Phase X9 — every mission-required event is allowlisted", async () => {
  const required = [
    "app_opened", "login", "logout", "invite_accepted", "screen_viewed",
    "recommendation_opened", "decision_center_viewed", "ai_analysis_opened",
    "portfolio_viewed", "market_dashboard_viewed", "impact_graph_viewed",
    "notification_clicked", "workspace_created", "workspace_deleted",
    "settings_changed", "error_encountered", "session_ended",
  ];
  for (const eventName of required) {
    assert.ok(analyticsService.ALLOWED_EVENTS.has(eventName), `missing required event: ${eventName}`);
  }
});

test("Phase X9 — recordEvent stores a real, known screen value", async () => {
  await analyticsService.recordEvent({ eventName: "screen_viewed", screen: "Decision Center" });
  const prisma = getPrismaClient();
  const [row] = await prisma.analyticsEvent.findMany();
  assert.equal(row.screen, "Decision Center");
});

test("Phase X9 — recordEvent drops an unknown screen value rather than storing an arbitrary string", async () => {
  await analyticsService.recordEvent({ eventName: "screen_viewed", screen: "Not A Real Screen; DROP TABLE" });
  const prisma = getPrismaClient();
  const [row] = await prisma.analyticsEvent.findMany();
  assert.equal(row.screen, null);
});

test("Phase X9 — recordEvent stores a real duration when applicable, honestly null when not", async () => {
  await analyticsService.recordEvent({ eventName: "session_ended", durationMs: 45210 });
  await analyticsService.recordEvent({ eventName: "app_opened" });
  const prisma = getPrismaClient();
  const rows = await prisma.analyticsEvent.findMany({ orderBy: { createdAt: "asc" } });
  assert.equal(rows[0].durationMs, 45210);
  assert.equal(rows[1].durationMs, null);
});

// Phase X10 — Part 1, User Learning Engine.
test("Phase X10 — every new learning-engine event is allowlisted with real recommendationId/sourceName property support", async () => {
  const required = ["recommendation_saved", "recommendation_dismissed", "chart_opened", "symbol_watchlisted", "explanation_collapsed"];
  for (const eventName of required) {
    assert.ok(analyticsService.ALLOWED_EVENTS.has(eventName), `missing required event: ${eventName}`);
  }

  await analyticsService.recordEvent({ eventName: "recommendation_saved", properties: { recommendationId: "rec-1", symbol: "NVDA" } });
  const prisma = getPrismaClient();
  const [row] = await prisma.analyticsEvent.findMany();
  assert.deepEqual(row.properties, { recommendationId: "rec-1", symbol: "NVDA" });
});
