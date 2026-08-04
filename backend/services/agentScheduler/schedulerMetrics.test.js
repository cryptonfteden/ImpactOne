const test = require("node:test");
const assert = require("node:assert/strict");
const { createSchedulerMetrics } = require("./schedulerMetrics");

test("a fresh metrics collector reports honest zeros", () => {
  const metrics = createSchedulerMetrics();
  const snapshot = metrics.snapshot({ activeCount: 0, queueDepth: 0, concurrencyLimit: 10 });
  assert.equal(snapshot.totalScheduled, 0);
  assert.equal(snapshot.totalCompleted, 0);
  assert.equal(snapshot.avgWaitMs, 0);
  assert.equal(snapshot.avgExecMs, 0);
  assert.equal(snapshot.concurrencyLimit, 10);
});

test("recordCompleted buckets outcomes correctly and computes real averages", () => {
  const metrics = createSchedulerMetrics();
  metrics.recordScheduled();
  metrics.recordScheduled();
  metrics.recordScheduled();
  metrics.recordCompleted({ waitMs: 10, execMs: 100, outcome: "success" });
  metrics.recordCompleted({ waitMs: 20, execMs: 200, outcome: "timeout" });
  metrics.recordCompleted({ waitMs: 30, execMs: 50, outcome: "unavailable" });

  const snapshot = metrics.snapshot();
  assert.equal(snapshot.totalScheduled, 3);
  assert.equal(snapshot.totalCompleted, 3);
  assert.equal(snapshot.totalSucceeded, 1);
  assert.equal(snapshot.totalTimedOut, 1);
  assert.equal(snapshot.totalUnavailable, 1);
  assert.equal(snapshot.avgWaitMs, 20);
  assert.equal(snapshot.avgExecMs, (100 + 200 + 50) / 3);
});

test("recordCompleted with an unrecognized outcome falls into totalFailed, never silently dropped", () => {
  const metrics = createSchedulerMetrics();
  metrics.recordCompleted({ waitMs: 0, execMs: 0, outcome: "failure" });
  assert.equal(metrics.snapshot().totalFailed, 1);
});

test("recordDeduped/recordCancelled/recordRetry increment their own independent counters", () => {
  const metrics = createSchedulerMetrics();
  metrics.recordDeduped();
  metrics.recordDeduped();
  metrics.recordCancelled();
  metrics.recordRetry();
  metrics.recordRetry();
  metrics.recordRetry();
  const snapshot = metrics.snapshot();
  assert.equal(snapshot.totalDeduped, 2);
  assert.equal(snapshot.totalCancelled, 1);
  assert.equal(snapshot.totalRetries, 3);
});

test("recordQueueDepth tracks the real high-water mark, never decreasing on a smaller sample", () => {
  const metrics = createSchedulerMetrics();
  metrics.recordQueueDepth(5);
  metrics.recordQueueDepth(2);
  metrics.recordQueueDepth(9);
  metrics.recordQueueDepth(1);
  assert.equal(metrics.snapshot().maxObservedQueueDepth, 9);
});

test("reset() returns every counter to zero", () => {
  const metrics = createSchedulerMetrics();
  metrics.recordScheduled();
  metrics.recordCompleted({ waitMs: 5, execMs: 5, outcome: "success" });
  metrics.recordDeduped();
  metrics.reset();
  const snapshot = metrics.snapshot();
  assert.equal(snapshot.totalScheduled, 0);
  assert.equal(snapshot.totalCompleted, 0);
  assert.equal(snapshot.totalDeduped, 0);
  assert.equal(snapshot.avgWaitMs, 0);
});
