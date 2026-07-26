require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const { truncateAll } = require("../test/dbHelpers");
const app = require("../app");
const notificationRepository = require("../services/notificationRepository");
const watchlistFolderService = require("../services/watchlistFolderService");
const betaUserRepository = require("../services/betaUserRepository");

// Real HTTP requests need a real, persisted BetaUser row for the header
// to be honored by the real betaUserContext middleware (find-or-create,
// since betaUsers aren't truncated between tests).
let USER;
test.before(async () => {
  const inviteCode = "TEST-NOTIFICATION-CENTER-V1";
  const existing = await betaUserRepository.findByInviteCode(inviteCode);
  const betaUser = existing || (await betaUserRepository.createBetaUser({ label: "Notification Center Test User", inviteCode }));
  USER = betaUser.id;
});

test.beforeEach(async () => {
  await truncateAll();
});

test("a notification is enriched with its real workspace membership and a real deep-link target", async () => {
  const folder = await watchlistFolderService.createFolder(USER, "AI");
  await watchlistFolderService.addSymbol(USER, folder.id, "AAPL");
  await notificationRepository.createNotification({ betaUserId: USER, symbol: "AAPL", message: "a", targetPrice: 1, triggerPrice: 2, triggeredAt: new Date() });

  const response = await request(app).get("/api/v2/notifications").set("X-Beta-User-Id", USER);
  assert.equal(response.status, 200);
  assert.equal(response.body.notifications[0].workspace.name, "AI");
  assert.equal(response.body.notifications[0].deepLink.symbol, "AAPL");
  assert.equal(response.body.notifications[0].deepLink.workspaceId, folder.id);
});

test("an untracked symbol's notification has workspace: null — never a guessed folder", async () => {
  await notificationRepository.createNotification({ betaUserId: USER, symbol: "TSLA", message: "a", targetPrice: 1, triggerPrice: 2, triggeredAt: new Date() });
  const response = await request(app).get("/api/v2/notifications").set("X-Beta-User-Id", USER);
  assert.equal(response.body.notifications[0].workspace, null);
});

test("pinning persists and floats a notification to the top", async () => {
  await notificationRepository.createNotification({ betaUserId: USER, symbol: "AAPL", message: "old", targetPrice: 1, triggerPrice: 2, triggeredAt: new Date(Date.now() - 10000) });
  await notificationRepository.createNotification({ betaUserId: USER, symbol: "MSFT", message: "new", targetPrice: 1, triggerPrice: 2, triggeredAt: new Date() });

  const initial = await request(app).get("/api/v2/notifications").set("X-Beta-User-Id", USER);
  const older = initial.body.notifications.find((n) => n.symbol === "AAPL");

  await request(app).post(`/api/v2/notifications/${older.id}/pin`).set("X-Beta-User-Id", USER);

  const after = await request(app).get("/api/v2/notifications").set("X-Beta-User-Id", USER);
  assert.equal(after.body.notifications[0].symbol, "AAPL");
  assert.equal(after.body.notifications[0].isPinned, true);
  assert.equal(after.body.pinnedCount, 1);
});

test("grouping by day buckets real notifications by their real triggeredAt calendar date", async () => {
  await notificationRepository.createNotification({ betaUserId: USER, symbol: "AAPL", message: "a", targetPrice: 1, triggerPrice: 2, triggeredAt: new Date() });
  const response = await request(app).get("/api/v2/notifications?groupBy=day").set("X-Beta-User-Id", USER);
  const todayKey = new Date().toISOString().slice(0, 10);
  assert.ok(response.body.grouped[todayKey]);
  assert.equal(response.body.grouped[todayKey].length, 1);
});

test("grouping by workspace buckets real notifications by their real tracked folder", async () => {
  const folder = await watchlistFolderService.createFolder(USER, "AI");
  await watchlistFolderService.addSymbol(USER, folder.id, "AAPL");
  await notificationRepository.createNotification({ betaUserId: USER, symbol: "AAPL", message: "a", targetPrice: 1, triggerPrice: 2, triggeredAt: new Date() });
  await notificationRepository.createNotification({ betaUserId: USER, symbol: "TSLA", message: "b", targetPrice: 1, triggerPrice: 2, triggeredAt: new Date() });

  const response = await request(app).get("/api/v2/notifications?groupBy=workspace").set("X-Beta-User-Id", USER);
  assert.equal(response.body.grouped.AI.length, 1);
  assert.equal(response.body.grouped.Untracked.length, 1);
});

test("grouping by symbol buckets real notifications by their real symbol", async () => {
  await notificationRepository.createNotification({ betaUserId: USER, symbol: "AAPL", message: "a", targetPrice: 1, triggerPrice: 2, triggeredAt: new Date() });
  await notificationRepository.createNotification({ betaUserId: USER, symbol: "AAPL", message: "b", targetPrice: 1, triggerPrice: 2, triggeredAt: new Date() });

  const response = await request(app).get("/api/v2/notifications?groupBy=symbol").set("X-Beta-User-Id", USER);
  assert.equal(response.body.grouped.AAPL.length, 2);
});

test("notification navigation is isolated: User B cannot pin User A's notification", async () => {
  const inviteCode = "TEST-NOTIFICATION-CENTER-V1-USER-B";
  const existing = await betaUserRepository.findByInviteCode(inviteCode);
  const userB = existing || (await betaUserRepository.createBetaUser({ label: "User B", inviteCode }));

  await notificationRepository.createNotification({ betaUserId: USER, symbol: "AAPL", message: "a", targetPrice: 1, triggerPrice: 2, triggeredAt: new Date() });
  const initial = await request(app).get("/api/v2/notifications").set("X-Beta-User-Id", USER);
  const notification = initial.body.notifications[0];

  const response = await request(app).post(`/api/v2/notifications/${notification.id}/pin`).set("X-Beta-User-Id", userB.id);
  assert.equal(response.status, 404);
});
