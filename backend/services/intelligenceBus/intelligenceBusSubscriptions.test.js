require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const subscriptions = require("./intelligenceBusSubscriptions");

test.beforeEach(() => {
  subscriptions._resetForTests();
});

test("subscriber delivery: a matching subscriber receives the event", async () => {
  const received = [];
  subscriptions.subscribe("MissionControl", { engineId: "options" }, (event) => received.push(event));
  await subscriptions.dispatchToSubscribers({ engineId: "options", eventType: "SWEEP", symbols: ["NVDA"] });
  assert.equal(received.length, 1);
  assert.equal(received[0].engineId, "options");
});

test("subscriber delivery: a non-matching subscriber never receives the event", async () => {
  const received = [];
  subscriptions.subscribe("PortfolioWorkspace", { engineId: "sentiment" }, (event) => received.push(event));
  await subscriptions.dispatchToSubscribers({ engineId: "options", eventType: "SWEEP", symbols: ["NVDA"] });
  assert.equal(received.length, 0);
});

test("subscriber delivery: filters by symbol and eventType independently", async () => {
  const bySymbol = [];
  const byEventType = [];
  subscriptions.subscribe("Alerts", { symbol: "NVDA" }, (event) => bySymbol.push(event));
  subscriptions.subscribe("Watchlists", { eventType: "SWEEP" }, (event) => byEventType.push(event));
  await subscriptions.dispatchToSubscribers({ engineId: "options", eventType: "SWEEP", symbols: ["NVDA"] });
  await subscriptions.dispatchToSubscribers({ engineId: "options", eventType: "BLOCK_TRADE", symbols: ["META"] });
  assert.equal(bySymbol.length, 1);
  assert.equal(byEventType.length, 1);
});

test("subscriber delivery: multiple independent subscribers all receive a matching event", async () => {
  let countA = 0;
  let countB = 0;
  subscriptions.subscribe("MissionControl", {}, () => { countA += 1; });
  subscriptions.subscribe("AiChat", {}, () => { countB += 1; });
  await subscriptions.dispatchToSubscribers({ engineId: "sentiment", eventType: "OVERALL_UPDATE", symbols: [] });
  assert.equal(countA, 1);
  assert.equal(countB, 1);
});

test("ordering: a subscriber receives events in the exact order they were dispatched", async () => {
  const received = [];
  subscriptions.subscribe("MissionControl", {}, (event) => received.push(event.eventId));
  await subscriptions.dispatchToSubscribers({ engineId: "options", eventType: "A", symbols: [], eventId: 1 });
  await subscriptions.dispatchToSubscribers({ engineId: "options", eventType: "B", symbols: [], eventId: 2 });
  await subscriptions.dispatchToSubscribers({ engineId: "options", eventType: "C", symbols: [], eventId: 3 });
  assert.deepEqual(received, [1, 2, 3]);
});

test("subscriber delivery: unsubscribe stops further delivery without affecting other subscribers", async () => {
  const received = [];
  const unsubscribe = subscriptions.subscribe("MissionControl", {}, (event) => received.push(event));
  subscriptions.subscribe("AiChat", {}, () => {});
  unsubscribe();
  await subscriptions.dispatchToSubscribers({ engineId: "options", eventType: "SWEEP", symbols: [] });
  assert.equal(received.length, 0);
});

test("subscriber delivery: one subscriber's handler throwing never blocks delivery to the others", async () => {
  const received = [];
  subscriptions.subscribe("MissionControl", {}, () => { throw new Error("consumer bug"); });
  subscriptions.subscribe("AiChat", {}, (event) => received.push(event));
  const deliveries = await subscriptions.dispatchToSubscribers({ engineId: "options", eventType: "SWEEP", symbols: [] });
  assert.equal(received.length, 1);
  assert.equal(deliveries.some((delivery) => delivery.delivered === false), true);
  assert.equal(deliveries.some((delivery) => delivery.delivered === true), true);
});
