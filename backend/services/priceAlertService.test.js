require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const priceAlertService = require("./priceAlertService");
const notificationService = require("./notificationService");
const finnhubService = require("./finnhubService");

const USER_A = "beta-user-a";
const USER_B = "beta-user-b";

test.beforeEach(async () => {
  await truncateAll();
});

test("createAlert requires a beta user identity", async () => {
  await assert.rejects(
    () => priceAlertService.createAlert(null, { symbol: "AAPL", direction: "ABOVE", targetPrice: 300 }),
    (error) => error.statusCode === 400
  );
});

test("createAlert rejects an invalid direction", async () => {
  await assert.rejects(
    () => priceAlertService.createAlert(USER_A, { symbol: "AAPL", direction: "SIDEWAYS", targetPrice: 300 }),
    (error) => error.statusCode === 400
  );
});

test("multiple alerts per symbol are allowed", async () => {
  await priceAlertService.createAlert(USER_A, { symbol: "AAPL", direction: "ABOVE", targetPrice: 350 });
  await priceAlertService.createAlert(USER_A, { symbol: "AAPL", direction: "BELOW", targetPrice: 280 });

  const originalGetQuote = finnhubService.getQuote;
  finnhubService.getQuote = async () => ({ quote: { price: 320 } });
  try {
    const alerts = await priceAlertService.listAlerts(USER_A);
    assert.equal(alerts.length, 2);
    assert.equal(alerts.every((alert) => alert.symbol === "AAPL"), true);
  } finally {
    finnhubService.getQuote = originalGetQuote;
  }
});

test("listAlerts enriches with a real live quote and computes distance from target — never fabricated", async () => {
  await priceAlertService.createAlert(USER_A, { symbol: "AAPL", direction: "ABOVE", targetPrice: 300 });

  const originalGetQuote = finnhubService.getQuote;
  finnhubService.getQuote = async () => ({ quote: { price: 320 } });
  try {
    const [alert] = await priceAlertService.listAlerts(USER_A);
    assert.equal(alert.currentPrice, 320);
    assert.equal(alert.distanceFromTarget, 20);
  } finally {
    finnhubService.getQuote = originalGetQuote;
  }
});

test("listAlerts leaves currentPrice/distance honestly null when the live quote fails — never fabricated", async () => {
  await priceAlertService.createAlert(USER_A, { symbol: "AAPL", direction: "ABOVE", targetPrice: 300 });

  const originalGetQuote = finnhubService.getQuote;
  finnhubService.getQuote = async () => {
    throw new Error("quote unavailable");
  };
  try {
    const [alert] = await priceAlertService.listAlerts(USER_A);
    assert.equal(alert.currentPrice, null);
    assert.equal(alert.distanceFromTarget, null);
  } finally {
    finnhubService.getQuote = originalGetQuote;
  }
});

test("checkAndTriggerAlerts triggers an ABOVE alert when the real live price exceeds the target, and creates a notification", async () => {
  const alert = await priceAlertService.createAlert(USER_A, { symbol: "AAPL", direction: "ABOVE", targetPrice: 300 });

  const originalGetQuote = finnhubService.getQuote;
  finnhubService.getQuote = async () => ({ quote: { price: 310 } });
  try {
    const triggered = await priceAlertService.checkAndTriggerAlerts();
    assert.equal(triggered.length, 1);
    assert.equal(triggered[0].alertId, alert.id);
    assert.equal(triggered[0].triggerPrice, 310);

    const [reloaded] = await priceAlertService.listAlerts(USER_A);
    assert.equal(reloaded.status, "TRIGGERED");
    assert.equal(reloaded.triggerPrice, 310);
    assert.ok(reloaded.triggeredAt);

    const { notifications } = await notificationService.listNotifications(USER_A);
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].symbol, "AAPL");
    assert.equal(Number(notifications[0].triggerPrice), 310);
  } finally {
    finnhubService.getQuote = originalGetQuote;
  }
});

test("checkAndTriggerAlerts does NOT trigger a BELOW alert when the real live price is still above target", async () => {
  await priceAlertService.createAlert(USER_A, { symbol: "AAPL", direction: "BELOW", targetPrice: 280 });

  const originalGetQuote = finnhubService.getQuote;
  finnhubService.getQuote = async () => ({ quote: { price: 320 } });
  try {
    const triggered = await priceAlertService.checkAndTriggerAlerts();
    assert.equal(triggered.length, 0);

    const [alert] = await priceAlertService.listAlerts(USER_A);
    assert.equal(alert.status, "ACTIVE");
  } finally {
    finnhubService.getQuote = originalGetQuote;
  }
});

test("one-time trigger: a TRIGGERED alert never re-fires even if checked again while still past target", async () => {
  await priceAlertService.createAlert(USER_A, { symbol: "AAPL", direction: "ABOVE", targetPrice: 300 });

  const originalGetQuote = finnhubService.getQuote;
  finnhubService.getQuote = async () => ({ quote: { price: 310 } });
  try {
    const first = await priceAlertService.checkAndTriggerAlerts();
    assert.equal(first.length, 1);

    const second = await priceAlertService.checkAndTriggerAlerts();
    assert.equal(second.length, 0);

    const { notifications } = await notificationService.listNotifications(USER_A);
    assert.equal(notifications.length, 1); // still exactly one, not duplicated
  } finally {
    finnhubService.getQuote = originalGetQuote;
  }
});

test("checkAndTriggerAlerts is isolated: triggering User A's alert never touches User B's alert", async () => {
  const alertA = await priceAlertService.createAlert(USER_A, { symbol: "AAPL", direction: "ABOVE", targetPrice: 300 });
  const alertB = await priceAlertService.createAlert(USER_B, { symbol: "AAPL", direction: "ABOVE", targetPrice: 300 });

  const originalGetQuote = finnhubService.getQuote;
  finnhubService.getQuote = async () => ({ quote: { price: 310 } });
  try {
    const triggered = await priceAlertService.checkAndTriggerAlerts();
    assert.equal(triggered.length, 2);

    const notificationsA = await notificationService.listNotifications(USER_A);
    const notificationsB = await notificationService.listNotifications(USER_B);
    assert.equal(notificationsA.notifications.length, 1);
    assert.equal(notificationsB.notifications.length, 1);
    assert.notEqual(notificationsA.notifications[0].id, notificationsB.notifications[0].id);
  } finally {
    finnhubService.getQuote = originalGetQuote;
  }
});

test("User B cannot deactivate or delete User A's alert — 404, not leaked existence", async () => {
  const alertA = await priceAlertService.createAlert(USER_A, { symbol: "AAPL", direction: "ABOVE", targetPrice: 300 });

  await assert.rejects(
    () => priceAlertService.deactivateAlert(USER_B, alertA.id),
    (error) => error.statusCode === 404
  );
  await assert.rejects(
    () => priceAlertService.deleteAlert(USER_B, alertA.id),
    (error) => error.statusCode === 404
  );
});
