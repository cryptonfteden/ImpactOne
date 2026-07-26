require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../../test/dbHelpers");
const intelligenceBusService = require("./intelligenceBusService");
const subscriptions = require("./intelligenceBusSubscriptions");
const { FORBIDDEN_GOVERNANCE_KEYS } = require("./intelligenceBusGovernance");

function optionsSweepEvent(overrides = {}) {
  return {
    engineId: "options",
    eventType: "SWEEP",
    symbols: ["NVDA"],
    payload: { anomalyScore: 80, explanation: "NVDA calls swept 3 exchanges." },
    provenance: { sourceEngine: "options", sourceEventId: "sig_1" },
    confidence: 78,
    publishedAt: "2026-07-26T14:30:00.000Z",
    methodologyVersion: "options-agent-v1",
    ...overrides,
  };
}

function sentimentOverallEvent(overrides = {}) {
  return {
    engineId: "sentiment",
    eventType: "OVERALL_UPDATE",
    symbols: [],
    payload: { score: 60, summary: "US overall sentiment updated." },
    provenance: { sourceEngine: "sentiment", market: "US" },
    confidence: 55,
    publishedAt: "2026-07-26T21:00:00.000Z",
    methodologyVersion: "sentiment-engine-v1",
    ...overrides,
  };
}

test.beforeEach(async () => {
  await truncateAll();
  subscriptions._resetForTests();
});

test("publishEvent persists a real, retrievable event with the required shape", async () => {
  const published = await intelligenceBusService.publishEvent(optionsSweepEvent());
  assert.equal(published.duplicate, false);
  assert.equal(published.engineId, "options");
  assert.equal(published.confidence, 78);
  assert.equal(published.lifecycleStatus, "ACTIVE");
  assert.equal(published.label, "Signal — not a recommendation");

  const fetched = await intelligenceBusService.getEventById(published.id);
  assert.equal(fetched.id, published.id);
});

test("deduplication: publishing the exact same event twice returns the same row, never creates a second one", async () => {
  const first = await intelligenceBusService.publishEvent(optionsSweepEvent());
  const second = await intelligenceBusService.publishEvent(optionsSweepEvent());
  assert.equal(second.duplicate, true);
  assert.equal(second.id, first.id);

  const all = await intelligenceBusService.getEvents({ engineId: "options" });
  assert.equal(all.length, 1);
});

test("deduplication: two genuinely different events (different payload) are both persisted", async () => {
  await intelligenceBusService.publishEvent(optionsSweepEvent());
  await intelligenceBusService.publishEvent(optionsSweepEvent({ payload: { anomalyScore: 65, explanation: "A different sweep." } }));
  const all = await intelligenceBusService.getEvents({ engineId: "options" });
  assert.equal(all.length, 2);
});

test("ordering: getEvents returns events in the exact order they were published", async () => {
  await intelligenceBusService.publishEvent(optionsSweepEvent({ publishedAt: "2026-07-26T14:00:00.000Z", payload: { anomalyScore: 1 } }));
  await intelligenceBusService.publishEvent(optionsSweepEvent({ publishedAt: "2026-07-26T15:00:00.000Z", payload: { anomalyScore: 2 } }));
  await intelligenceBusService.publishEvent(optionsSweepEvent({ publishedAt: "2026-07-26T16:00:00.000Z", payload: { anomalyScore: 3 } }));

  const events = await intelligenceBusService.getEvents({ engineId: "options" });
  assert.deepEqual(events.map((event) => event.payload.anomalyScore), [1, 2, 3]);
});

test("ordering: publishing out of chronological order still returns results ordered by real publishedAt", async () => {
  await intelligenceBusService.publishEvent(optionsSweepEvent({ publishedAt: "2026-07-26T16:00:00.000Z", payload: { anomalyScore: 3 } }));
  await intelligenceBusService.publishEvent(optionsSweepEvent({ publishedAt: "2026-07-26T14:00:00.000Z", payload: { anomalyScore: 1 } }));
  await intelligenceBusService.publishEvent(optionsSweepEvent({ publishedAt: "2026-07-26T15:00:00.000Z", payload: { anomalyScore: 2 } }));

  const events = await intelligenceBusService.getEvents({ engineId: "options" });
  assert.deepEqual(events.map((event) => event.payload.anomalyScore), [1, 2, 3]);
});

test("subscriber delivery: a real subscriber receives a real published event exactly once", async () => {
  const received = [];
  intelligenceBusService.subscribe("MissionControl", { engineId: "options" }, (event) => received.push(event));
  await intelligenceBusService.publishEvent(optionsSweepEvent());
  assert.equal(received.length, 1);
  assert.equal(received[0].engineId, "options");
});

test("subscriber delivery: a duplicate publish never re-delivers to subscribers", async () => {
  const received = [];
  intelligenceBusService.subscribe("MissionControl", {}, (event) => received.push(event));
  await intelligenceBusService.publishEvent(optionsSweepEvent());
  await intelligenceBusService.publishEvent(optionsSweepEvent());
  assert.equal(received.length, 1);
});

test("subscriber delivery: only subscribers whose filter matches the engine receive it", async () => {
  const optionsReceived = [];
  const sentimentReceived = [];
  intelligenceBusService.subscribe("Alerts", { engineId: "options" }, (event) => optionsReceived.push(event));
  intelligenceBusService.subscribe("Watchlists", { engineId: "sentiment" }, (event) => sentimentReceived.push(event));
  await intelligenceBusService.publishEvent(optionsSweepEvent());
  assert.equal(optionsReceived.length, 1);
  assert.equal(sentimentReceived.length, 0);
});

test("confidence propagation: the normalized confidence on the published event matches the engine's real reported confidence", async () => {
  const published = await intelligenceBusService.publishEvent(optionsSweepEvent({ confidence: 91 }));
  assert.equal(published.confidence, 91);
  assert.equal(published.rawConfidence, 91);
});

test("confidence propagation: an engine reporting no confidence stays honestly null through to the published event", async () => {
  const published = await intelligenceBusService.publishEvent(optionsSweepEvent({ confidence: null }));
  assert.equal(published.confidence, null);
});

test("provenance: the published event carries the real provenance the engine supplied, never fabricated", async () => {
  const published = await intelligenceBusService.publishEvent(optionsSweepEvent({ provenance: { sourceEngine: "options", sourceEventId: "sig_42" } }));
  assert.equal(published.provenance.sourceEngine, "options");
  assert.equal(published.provenance.sourceEventId, "sig_42");
});

test("provenance: provenance without a required sourceEngine field is rejected at publish time, never silently accepted", async () => {
  await assert.rejects(() => intelligenceBusService.publishEvent(optionsSweepEvent({ provenance: {} })), /Invalid intelligence event/);
});

test("event expiry: an options event past its intraday expiry horizon is reported EXPIRED when read later", async () => {
  const published = await intelligenceBusService.publishEvent(optionsSweepEvent({ publishedAt: "2026-07-20T14:00:00.000Z" }));
  const readLater = await intelligenceBusService.getEventById(published.id, { now: new Date("2026-07-26T20:00:00.000Z") });
  assert.equal(readLater.lifecycleStatus, "EXPIRED");
});

test("event expiry: the same event read shortly after publish is still ACTIVE", async () => {
  const published = await intelligenceBusService.publishEvent(optionsSweepEvent({ publishedAt: "2026-07-26T14:00:00.000Z" }));
  const readSoon = await intelligenceBusService.getEventById(published.id, { now: new Date("2026-07-26T14:05:00.000Z") });
  assert.equal(readSoon.lifecycleStatus, "ACTIVE");
});

test("lifecycle: a newer event in the same series (same engine/eventType/symbols) supersedes the prior ACTIVE one", async () => {
  const first = await intelligenceBusService.publishEvent(sentimentOverallEvent({ publishedAt: "2026-07-25T21:00:00.000Z", payload: { score: 50 } }));
  const second = await intelligenceBusService.publishEvent(sentimentOverallEvent({ publishedAt: "2026-07-26T21:00:00.000Z", payload: { score: 60 } }));

  const firstReread = await intelligenceBusService.getEventById(first.id);
  assert.equal(firstReread.lifecycleStatus, "SUPERSEDED");
  assert.equal(firstReread.supersededByEventId, second.id);

  const secondReread = await intelligenceBusService.getEventById(second.id);
  assert.equal(secondReread.lifecycleStatus, "ACTIVE");
});

test("lifecycle: events from a different engine/symbol series are never superseded by an unrelated publish", async () => {
  await intelligenceBusService.publishEvent(optionsSweepEvent());
  const sentimentEvent = await intelligenceBusService.publishEvent(sentimentOverallEvent());
  await intelligenceBusService.publishEvent(sentimentOverallEvent({ publishedAt: "2026-07-27T21:00:00.000Z", payload: { score: 40 } }));

  const optionsEvents = await intelligenceBusService.getEvents({ engineId: "options" });
  assert.equal(optionsEvents[0].lifecycleStatus, "ACTIVE"); // untouched by the sentiment series' supersession
});

test("governance field prohibition: publishEvent rejects a raw event carrying a forbidden top-level field", async () => {
  await assert.rejects(() => intelligenceBusService.publishEvent(optionsSweepEvent({ action: "BUY" })), (error) => {
    assert.match(error.message, /governance violation/);
    return true;
  });
});

test("governance field prohibition: publishEvent rejects a forbidden field nested in the payload", async () => {
  await assert.rejects(() => intelligenceBusService.publishEvent(optionsSweepEvent({ payload: { anomalyScore: 80, recommendation: "Buy now" } })), /governance violation/);
});

test("governance field prohibition: a real, persisted, round-tripped event never carries a forbidden field", async () => {
  const published = await intelligenceBusService.publishEvent(optionsSweepEvent());
  const fetched = await intelligenceBusService.getEventById(published.id);
  for (const key of FORBIDDEN_GOVERNANCE_KEYS) {
    assert.equal(key in fetched, false);
  }
});

test("publishEvent rejects a malformed event without touching persistence", async () => {
  await assert.rejects(() => intelligenceBusService.publishEvent({ engineId: "options" }), /Invalid intelligence event/);
  const all = await intelligenceBusService.getEvents({ engineId: "options" });
  assert.equal(all.length, 0);
});
