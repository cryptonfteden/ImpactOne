require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const notificationService = require("./notificationService");
const notificationRepository = require("./notificationRepository");

const USER_A = "beta-user-a";
const USER_B = "beta-user-b";

test.beforeEach(async () => {
  await truncateAll();
});

async function seedNotification(betaUserId, symbol = "AAPL") {
  return notificationRepository.createNotification({
    betaUserId,
    symbol,
    message: `${symbol} rose above your target of $300.00 — now $310.00.`,
    targetPrice: 300,
    triggerPrice: 310,
    triggeredAt: new Date(),
  });
}

test("listNotifications requires a beta user identity", async () => {
  await assert.rejects(() => notificationService.listNotifications(null), (error) => error.statusCode === 400);
});

test("a fresh notification starts unread and counts toward unreadCount", async () => {
  await seedNotification(USER_A);
  const { notifications, unreadCount } = await notificationService.listNotifications(USER_A);
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].isRead, false);
  assert.equal(unreadCount, 1);
});

test("markRead flips isRead and reduces unreadCount", async () => {
  const notification = await seedNotification(USER_A);
  await notificationService.markRead(USER_A, notification.id);

  const { notifications, unreadCount } = await notificationService.listNotifications(USER_A);
  assert.equal(notifications[0].isRead, true);
  assert.equal(unreadCount, 0);
});

test("clearNotification removes it entirely", async () => {
  const notification = await seedNotification(USER_A);
  await notificationService.clearNotification(USER_A, notification.id);

  const { notifications } = await notificationService.listNotifications(USER_A);
  assert.equal(notifications.length, 0);
});

// Phase H3 — notification isolation, the mission's explicit requirement.
test("User B cannot mark read or clear User A's notification — 404, not leaked existence", async () => {
  const notificationA = await seedNotification(USER_A);

  await assert.rejects(
    () => notificationService.markRead(USER_B, notificationA.id),
    (error) => error.statusCode === 404
  );
  await assert.rejects(
    () => notificationService.clearNotification(USER_B, notificationA.id),
    (error) => error.statusCode === 404
  );

  // Untouched by either attempt.
  const { notifications } = await notificationService.listNotifications(USER_A);
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].isRead, false);
});

test("listNotifications only ever returns the calling user's own notifications", async () => {
  await seedNotification(USER_A, "AAPL");
  await seedNotification(USER_B, "NVDA");

  const resultA = await notificationService.listNotifications(USER_A);
  const resultB = await notificationService.listNotifications(USER_B);

  assert.equal(resultA.notifications.length, 1);
  assert.equal(resultA.notifications[0].symbol, "AAPL");
  assert.equal(resultB.notifications.length, 1);
  assert.equal(resultB.notifications[0].symbol, "NVDA");
});
