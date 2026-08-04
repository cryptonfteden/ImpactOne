require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const { getPrismaClient } = require("../db/prismaClient");
const decisionTimelineService = require("./decisionTimelineService");
const watchlistFolderService = require("./watchlistFolderService");
const workspaceService = require("./workspaceService");
const notificationRepository = require("./notificationRepository");

const USER_A = "timeline-user-a";
const USER_B = "timeline-user-b";

test.beforeEach(async () => {
  await truncateAll();
});

test("getDecisionTimeline requires a beta user identity", async () => {
  await assert.rejects(() => decisionTimelineService.getDecisionTimeline(null), (error) => error.statusCode === 400);
});

test("returns an honest empty timeline with the two disclosed unavailable sources, when nothing has happened yet", async () => {
  const result = await decisionTimelineService.getDecisionTimeline(USER_A);
  assert.deepEqual(result.events, []);
  assert.equal(result.unavailableSources.length, 2);
  assert.ok(result.unavailableSources.some((entry) => entry.source === "marketPositioningChanges"));
  assert.ok(result.unavailableSources.some((entry) => entry.source === "opportunityScoreChanges"));
});

test("merges real workspace activity and real triggered alerts into one chronological story, isolated per user", async () => {
  const folder = await watchlistFolderService.createFolder(USER_A, "AI");
  await watchlistFolderService.addSymbol(USER_A, folder.id, "NVDA");
  await workspaceService.addNote(USER_A, folder.id, "Watching NVDA closely.");
  await notificationRepository.createNotification({ betaUserId: USER_A, symbol: "NVDA", message: "NVDA rose above target.", targetPrice: 100, triggerPrice: 110, triggeredAt: new Date() });

  const result = await decisionTimelineService.getDecisionTimeline(USER_A);
  const types = result.events.map((event) => event.type);
  assert.ok(types.includes("WORKSPACE_ACTIVITY"));
  assert.ok(types.includes("ALERT"));
  assert.ok(result.events.every((event) => new Date(event.timestamp).getTime()));

  const otherUser = await decisionTimelineService.getDecisionTimeline(USER_B);
  assert.deepEqual(otherUser.events, []);
});

test("real Impact Graph updates for a tracked symbol appear in the timeline, filtered by real symbol relevance", async () => {
  const prisma = getPrismaClient();
  const folder = await watchlistFolderService.createFolder(USER_A, "AI");
  await watchlistFolderService.addSymbol(USER_A, folder.id, "NVDA");

  const cause = await prisma.worldMemoryRecord.create({ data: { occurredAt: new Date(), symbols: ["TSM"], sectors: [], headline: "Taiwan event" } });
  const effect = await prisma.worldMemoryRecord.create({ data: { occurredAt: new Date(), symbols: ["NVDA"], sectors: [], headline: "NVDA supply risk" } });
  await prisma.worldMemoryCausalLink.create({ data: { causeRecordId: cause.id, effectRecordId: effect.id, explanation: "real causal link", confidence: 55, methodologyVersion: "x7-timeline" } });

  const irrelevantEffect = await prisma.worldMemoryRecord.create({ data: { occurredAt: new Date(), symbols: ["ZZZZ"], sectors: [], headline: "unrelated" } });
  await prisma.worldMemoryCausalLink.create({ data: { causeRecordId: null, effectRecordId: irrelevantEffect.id, explanation: "unrelated link", confidence: 40, methodologyVersion: "x7-timeline" } });

  const result = await decisionTimelineService.getDecisionTimeline(USER_A);
  const impactEvents = result.events.filter((event) => event.type === "IMPACT_GRAPH_UPDATE");
  assert.equal(impactEvents.length, 1);
  assert.equal(impactEvents[0].symbol, "NVDA");
  assert.equal(impactEvents[0].text, "real causal link");
});

test("events are sorted newest first, across every real source", async () => {
  const folder = await watchlistFolderService.createFolder(USER_A, "AI");
  await watchlistFolderService.addSymbol(USER_A, folder.id, "NVDA");
  await notificationRepository.createNotification({ betaUserId: USER_A, symbol: "NVDA", message: "old", targetPrice: 1, triggerPrice: 2, triggeredAt: new Date(Date.now() - 100000) });
  await notificationRepository.createNotification({ betaUserId: USER_A, symbol: "NVDA", message: "new", targetPrice: 1, triggerPrice: 2, triggeredAt: new Date() });

  const result = await decisionTimelineService.getDecisionTimeline(USER_A);
  const timestamps = result.events.map((event) => new Date(event.timestamp).getTime());
  const sorted = [...timestamps].sort((a, b) => b - a);
  assert.deepEqual(timestamps, sorted);
});
