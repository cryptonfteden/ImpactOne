const test = require("node:test");
const assert = require("node:assert/strict");
const { buildTimeline } = require("./executionTimeline");

test("buildTimeline on an empty set returns honest nulls/zeros, never throws", () => {
  const timeline = buildTimeline([]);
  assert.equal(timeline.startedAtMs, null);
  assert.equal(timeline.endedAtMs, null);
  assert.equal(timeline.totalDurationMs, 0);
  assert.deepEqual(timeline.events, []);
});

test("buildTimeline orders events chronologically and computes real relative offsets", () => {
  const records = [
    { executionId: "e2", agentId: "b", startedAtMs: 1200, endedAtMs: 1300, durationMs: 100 },
    { executionId: "e1", agentId: "a", startedAtMs: 1000, endedAtMs: 1150, durationMs: 150 },
  ];
  const timeline = buildTimeline(records);
  assert.equal(timeline.startedAtMs, 1000);
  assert.equal(timeline.endedAtMs, 1300);
  assert.equal(timeline.totalDurationMs, 300);
  assert.deepEqual(timeline.events.map((e) => e.executionId), ["e1", "e2"]);
  assert.equal(timeline.events[0].offsetMs, 0);
  assert.equal(timeline.events[1].offsetMs, 200);
});

test("buildTimeline preserves every generic observability field on each event", () => {
  const records = [
    {
      executionId: "e1",
      correlationId: "c1",
      agentId: "technical",
      agentName: "Technical Analysis Agent",
      symbol: "NVDA",
      startedAtMs: 0,
      endedAtMs: 50,
      durationMs: 50,
      success: true,
      timeout: false,
      retryCount: 0,
      healthStatus: "healthy",
      confidence: 80,
      failureCode: "NONE",
      cacheHit: true,
      dataSourcesUsed: ["finnhub"],
    },
  ];
  const { events } = buildTimeline(records);
  assert.deepEqual(events[0], {
    executionId: "e1",
    correlationId: "c1",
    agentId: "technical",
    agentName: "Technical Analysis Agent",
    symbol: "NVDA",
    offsetMs: 0,
    durationMs: 50,
    success: true,
    timeout: false,
    retryCount: 0,
    healthStatus: "healthy",
    confidence: 80,
    failureCode: "NONE",
    cacheHit: true,
    dataSourcesUsed: ["finnhub"],
  });
});
