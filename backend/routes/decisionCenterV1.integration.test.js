require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const { truncateAll } = require("../test/dbHelpers");
const app = require("../app");
const notificationRepository = require("../services/notificationRepository");
const watchlistFolderService = require("../services/watchlistFolderService");
const betaUserRepository = require("../services/betaUserRepository");

// Real HTTP requests go through the real betaUserContext middleware,
// which only honors an X-Beta-User-Id header that resolves to a real,
// persisted BetaUser row (unlike the direct service-level tests
// elsewhere in this codebase, which call services directly and can use
// any synthetic string) — so integration tests need a real row.
// betaUsers aren't truncated between tests (matches this codebase's
// established H2 convention), so this is find-or-create, not create.
let USER;
test.before(async () => {
  const inviteCode = "TEST-DECISION-CENTER-V1";
  const existing = await betaUserRepository.findByInviteCode(inviteCode);
  const betaUser = existing || (await betaUserRepository.createBetaUser({ label: "Decision Center Test User", inviteCode }));
  USER = betaUser.id;
});

test.beforeEach(async () => {
  await truncateAll();
});

test("a decision item carries real workspace, portfolio impact, and alert state enrichment", async () => {
  const folder = await watchlistFolderService.createFolder(USER, "AI");
  await watchlistFolderService.addSymbol(USER, folder.id, "AAPL");
  await notificationRepository.createNotification({
    betaUserId: USER,
    symbol: "AAPL",
    message: "AAPL rose above your target of $300.00 — now $310.00.",
    targetPrice: 300,
    triggerPrice: 310,
    triggeredAt: new Date(),
  });

  const response = await request(app).get("/api/v2/decisions").set("X-Beta-User-Id", USER);
  assert.equal(response.status, 200);
  const item = response.body.items.find((entry) => entry.symbol === "AAPL");
  assert.equal(item.workspace, "AI");
  assert.equal(item.portfolioImpact, false); // real check — no position held
  assert.equal(item.confidence, 100); // triggered alert = real, maximal confidence
});

test("pinning a decision item persists real state and floats it to the top regardless of sort", async () => {
  await notificationRepository.createNotification({ betaUserId: USER, symbol: "AAPL", message: "a", targetPrice: 1, triggerPrice: 2, triggeredAt: new Date(Date.now() - 10000) });
  await notificationRepository.createNotification({ betaUserId: USER, symbol: "MSFT", message: "b", targetPrice: 1, triggerPrice: 2, triggeredAt: new Date() });

  const initial = await request(app).get("/api/v2/decisions").set("X-Beta-User-Id", USER);
  const olderItem = initial.body.items.find((entry) => entry.symbol === "AAPL");

  const pinResponse = await request(app).post(`/api/v2/decisions/${olderItem.id}/pin`).set("X-Beta-User-Id", USER);
  assert.equal(pinResponse.status, 204);

  const after = await request(app).get("/api/v2/decisions?sortBy=time").set("X-Beta-User-Id", USER);
  assert.equal(after.body.items[0].symbol, "AAPL"); // pinned floats to top despite being older
  assert.equal(after.body.items[0].status, "PINNED");
});

test("dismissing a decision item removes it from the default list, never deletes the underlying data", async () => {
  await notificationRepository.createNotification({ betaUserId: USER, symbol: "AAPL", message: "a", targetPrice: 1, triggerPrice: 2, triggeredAt: new Date() });
  const initial = await request(app).get("/api/v2/decisions").set("X-Beta-User-Id", USER);
  const item = initial.body.items[0];

  await request(app).post(`/api/v2/decisions/${item.id}/dismiss`).set("X-Beta-User-Id", USER);

  const afterDefault = await request(app).get("/api/v2/decisions").set("X-Beta-User-Id", USER);
  assert.equal(afterDefault.body.items.length, 0);

  const afterIncluding = await request(app).get("/api/v2/decisions?includeDismissed=true").set("X-Beta-User-Id", USER);
  assert.equal(afterIncluding.body.items.length, 1);
  assert.equal(afterIncluding.body.items[0].status, "DISMISSED");
});

test("marking a decision item completed persists real state", async () => {
  await notificationRepository.createNotification({ betaUserId: USER, symbol: "AAPL", message: "a", targetPrice: 1, triggerPrice: 2, triggeredAt: new Date() });
  const initial = await request(app).get("/api/v2/decisions").set("X-Beta-User-Id", USER);
  const item = initial.body.items[0];

  await request(app).post(`/api/v2/decisions/${item.id}/complete`).set("X-Beta-User-Id", USER);

  const after = await request(app).get("/api/v2/decisions?includeDismissed=true").set("X-Beta-User-Id", USER);
  assert.equal(after.body.items[0].status, "COMPLETED");
});

test("sorting by confidence orders items by their real confidence value", async () => {
  const prisma = require("../db/prismaClient").getPrismaClient();
  await prisma.recommendation.create({
    data: {
      symbol: "NVDA", action: "BUY", confidenceScore: 80, expectedUpside: "10%", expectedDownside: "-5%",
      riskScore: 40, riskLabel: "Moderate", positionSizeSuggestion: "2%", reasoning: "test", evidence: {},
      explanation: {}, scenarios: [], qualityScore: 30, qualityComponents: {}, status: "ACTIVE",
    },
  });
  const folder = await watchlistFolderService.createFolder(USER, "AI");
  await watchlistFolderService.addSymbol(USER, folder.id, "NVDA");
  await notificationRepository.createNotification({ betaUserId: USER, symbol: "AAPL", message: "a", targetPrice: 1, triggerPrice: 2, triggeredAt: new Date() });

  const response = await request(app).get("/api/v2/decisions?sortBy=confidence").set("X-Beta-User-Id", USER);
  // The triggered alert (confidence 100) must rank above the low-quality-score recommendation (30).
  assert.equal(response.body.items[0].confidence, 100);
});

test("Decision Center is isolated: User B never sees User A's pinned/dismissed state or items", async () => {
  const inviteCode = "TEST-DECISION-CENTER-V1-USER-B";
  const existing = await betaUserRepository.findByInviteCode(inviteCode);
  const userB = existing || (await betaUserRepository.createBetaUser({ label: "User B", inviteCode }));

  await notificationRepository.createNotification({ betaUserId: USER, symbol: "AAPL", message: "a", targetPrice: 1, triggerPrice: 2, triggeredAt: new Date() });
  const otherResponse = await request(app).get("/api/v2/decisions").set("X-Beta-User-Id", userB.id);
  assert.equal(otherResponse.status, 200);
  assert.equal(otherResponse.body.items.length, 0);
});
