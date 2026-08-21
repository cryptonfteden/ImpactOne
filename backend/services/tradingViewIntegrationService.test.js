const test = require("node:test");
const assert = require("node:assert/strict");
const service = require("./tradingViewIntegrationService");

const valid = () => ({ secret: "test-secret", symbol: "NASDAQ:NVDA", event: "APPROACHING_0886", timeframe: "1W", price: 180, barTime: new Date().toISOString() });
const report = async () => ({ dataAvailable: true, generatedAt: new Date().toISOString(), retracementLevels: [{ ratio: 0.886, price: 175 }] });
const publish = async () => ({ id: "bus-event-1", duplicate: false });

test.beforeEach(() => service.resetForTests());

test("rejects an invalid webhook secret", async () => {
  await assert.rejects(() => service.receiveWebhook({ ...valid(), secret: "wrong" }, { configuredSecret: "test-secret", generateReport: report }), (error) => error.statusCode === 401);
});

test("accepts, normalizes and independently recalculates a Pine alert", async () => {
  const result = await service.receiveWebhook(valid(), { configuredSecret: "test-secret", generateReport: report, publishEvent: publish });
  assert.equal(result.accepted, true);
  assert.equal(result.signal.symbol, "NVDA");
  assert.equal(result.verification.point886, 175);
  assert.equal(result.verification.status, "CALCULATED_NOT_CERTIFIED");
  assert.equal(result.verification.insideApprovedApproachZone, true);
  assert.equal(result.verification.approvedZone.maxDistancePct, 5);
  assert.equal(result.persistence.status, "PERSISTED");
});

test("keeps a real alert as evidence but marks prices beyond 5% as outside the approved zone", async () => {
  const result = await service.receiveWebhook({ ...valid(), price: 185 }, { configuredSecret: "test-secret", generateReport: report, publishEvent: publish });
  assert.equal(result.accepted, true);
  assert.equal(result.verification.insideApprovedApproachZone, false);
  assert.equal(result.verification.status, "OUTSIDE_APPROVED_ZONE");
  assert.ok(result.verification.distancePct > 5);
});

test("deduplicates the same symbol/event/timeframe/bar", async () => {
  const payload = valid();
  await service.receiveWebhook(payload, { configuredSecret: "test-secret", generateReport: report, publishEvent: publish });
  const duplicate = await service.receiveWebhook(payload, { configuredSecret: "test-secret", generateReport: report, publishEvent: publish });
  assert.equal(duplicate.duplicate, true);
  assert.equal(service.getInMemoryRecentSignals().length, 1);
  assert.equal(service.getInMemoryRecentSignals(1)[0].signal.symbol, "NVDA");
});

test("reads persisted TradingView signals from the intelligence bus", async () => {
  const events = async () => [{
    id: "event-1", eventType: "ENTERED_0886_ZONE", symbols: ["NOW"], ingestedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(), provenance: { signalId: "signal-1" },
    payload: { timeframe: "1W", price: 900, verificationStatus: "CALCULATED_NOT_CERTIFIED", impactOnePoint886: 880, distancePct: 2.27 },
  }];
  const result = await service.getRecentSignals(10, events);
  assert.equal(result[0].signal.symbol, "NOW");
  assert.equal(result[0].persistence.status, "PERSISTED");
});

test("rejects unsupported timeframes and stale alerts", async () => {
  await assert.rejects(() => service.receiveWebhook({ ...valid(), timeframe: "2H" }, { configuredSecret: "test-secret", generateReport: report }), (error) => error.statusCode === 400);
  await assert.rejects(() => service.receiveWebhook({ ...valid(), barTime: "2020-01-01T00:00:00.000Z" }, { configuredSecret: "test-secret", generateReport: report }), (error) => error.statusCode === 422);
});
