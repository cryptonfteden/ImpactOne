require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const { getPrismaClient } = require("../db/prismaClient");
const decisionCenterService = require("./decisionCenterService");
const notificationRepository = require("./notificationRepository");
const watchlistFolderService = require("./watchlistFolderService");

const USER = "beta-user-decision-center";

test.beforeEach(async () => {
  await truncateAll();
});

test("getDecisions requires a beta user identity", async () => {
  await assert.rejects(() => decisionCenterService.getDecisions(null), (error) => error.statusCode === 400);
});

test("always discloses the two real, currently-unavailable sources — never fabricates workspace-activity or opportunity-score-movement history", async () => {
  const result = await decisionCenterService.getDecisions(USER);
  const names = result.unavailableSources.map((entry) => entry.source).sort();
  assert.deepEqual(names, ["opportunityScoreMovement", "workspaceActivity"]);
});

test("a real triggered price alert becomes a real HIGH-priority decision item with reason/evidence/action/timestamp", async () => {
  await notificationRepository.createNotification({
    betaUserId: USER,
    symbol: "AAPL",
    message: "AAPL rose above your target of $300.00 — now $310.00.",
    targetPrice: 300,
    triggerPrice: 310,
    triggeredAt: new Date(),
  });

  const result = await decisionCenterService.getDecisions(USER);
  const item = result.items.find((entry) => entry.source === "priceAlert");
  assert.ok(item);
  assert.equal(item.symbol, "AAPL");
  assert.equal(item.priority, "HIGH");
  assert.ok(item.reason);
  assert.ok(item.evidence);
  assert.ok(item.suggestedAction);
  assert.ok(item.timestamp);
});

test("isolated per beta user — User B's decisions never include User A's triggered alert", async () => {
  await notificationRepository.createNotification({
    betaUserId: USER,
    symbol: "AAPL",
    message: "real trigger",
    targetPrice: 300,
    triggerPrice: 310,
    triggeredAt: new Date(),
  });

  const otherUserResult = await decisionCenterService.getDecisions("beta-user-other");
  assert.equal(otherUserResult.items.length, 0);
});

test("a new active recommendation for a tracked workspace symbol becomes a MEDIUM-priority decision item", async () => {
  const prisma = getPrismaClient();
  const folder = await watchlistFolderService.createFolder(USER, "AI");
  await watchlistFolderService.addSymbol(USER, folder.id, "NVDA");

  await prisma.recommendation.create({
    data: {
      symbol: "NVDA",
      action: "BUY",
      confidenceScore: 80,
      expectedUpside: "10-15%",
      expectedDownside: "-5%",
      riskScore: 40,
      riskLabel: "Moderate",
      positionSizeSuggestion: "2-4%",
      reasoning: "Real test reasoning for a tracked symbol.",
      evidence: {},
      explanation: {},
      scenarios: [],
      qualityScore: 75,
      qualityComponents: {},
    },
  });

  const result = await decisionCenterService.getDecisions(USER);
  const item = result.items.find((entry) => entry.symbol === "NVDA");
  assert.ok(item);
  assert.equal(item.priority, "MEDIUM");
  assert.equal(item.evidence, "Real test reasoning for a tracked symbol.");
});

test("filtering by source and priority returns only real matching items", async () => {
  await notificationRepository.createNotification({ betaUserId: USER, symbol: "AAPL", message: "x", targetPrice: 1, triggerPrice: 2, triggeredAt: new Date() });

  const filtered = await decisionCenterService.getDecisions(USER, { source: "priceAlert" });
  assert.ok(filtered.items.every((item) => item.source === "priceAlert"));

  const filteredPriority = await decisionCenterService.getDecisions(USER, { priority: "HIGH" });
  assert.ok(filteredPriority.items.every((item) => item.priority === "HIGH"));
});

test("grouping buckets items by their real source", async () => {
  await notificationRepository.createNotification({ betaUserId: USER, symbol: "AAPL", message: "x", targetPrice: 1, triggerPrice: 2, triggeredAt: new Date() });
  const result = await decisionCenterService.getDecisions(USER);
  assert.ok(Array.isArray(result.grouped.priceAlert));
});
