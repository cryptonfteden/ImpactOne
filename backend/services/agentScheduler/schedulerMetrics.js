// Phase AGENT-SCHEDULER-001 — pure counters/aggregates about the
// scheduler's own mechanics (queueing, concurrency, retries,
// cancellation, dedup). No business logic, no agent content — this is
// the scheduler's equivalent of AGENT-OBSERVABILITY-001's
// metricsCollector, but about the scheduler itself rather than about
// per-agent execution history.
function createSchedulerMetrics() {
  const state = {
    totalScheduled: 0,
    totalCompleted: 0,
    totalSucceeded: 0,
    totalFailed: 0,
    totalTimedOut: 0,
    totalUnavailable: 0,
    totalCancelled: 0,
    totalRetries: 0,
    totalDeduped: 0,
    maxObservedQueueDepth: 0,
    waitMsSamples: [],
    execMsSamples: [],
  };

  function recordScheduled() {
    state.totalScheduled += 1;
  }

  function recordQueueDepth(depth) {
    if (depth > state.maxObservedQueueDepth) state.maxObservedQueueDepth = depth;
  }

  function recordDeduped() {
    state.totalDeduped += 1;
  }

  function recordCancelled() {
    state.totalCancelled += 1;
  }

  function recordRetry() {
    state.totalRetries += 1;
  }

  /** @param {{ waitMs: number, execMs: number, outcome: "success"|"failure"|"timeout"|"unavailable" }} */
  function recordCompleted({ waitMs, execMs, outcome }) {
    state.totalCompleted += 1;
    if (Number.isFinite(waitMs)) state.waitMsSamples.push(waitMs);
    if (Number.isFinite(execMs)) state.execMsSamples.push(execMs);
    if (outcome === "success") state.totalSucceeded += 1;
    else if (outcome === "timeout") state.totalTimedOut += 1;
    else if (outcome === "unavailable") state.totalUnavailable += 1;
    else state.totalFailed += 1;
  }

  function average(samples) {
    if (!samples.length) return 0;
    return samples.reduce((sum, n) => sum + n, 0) / samples.length;
  }

  function snapshot({ activeCount = 0, queueDepth = 0, concurrencyLimit = 0 } = {}) {
    return {
      totalScheduled: state.totalScheduled,
      totalCompleted: state.totalCompleted,
      totalSucceeded: state.totalSucceeded,
      totalFailed: state.totalFailed,
      totalTimedOut: state.totalTimedOut,
      totalUnavailable: state.totalUnavailable,
      totalCancelled: state.totalCancelled,
      totalRetries: state.totalRetries,
      totalDeduped: state.totalDeduped,
      activeCount,
      queueDepth,
      concurrencyLimit,
      maxObservedQueueDepth: state.maxObservedQueueDepth,
      avgWaitMs: average(state.waitMsSamples),
      avgExecMs: average(state.execMsSamples),
    };
  }

  function reset() {
    state.totalScheduled = 0;
    state.totalCompleted = 0;
    state.totalSucceeded = 0;
    state.totalFailed = 0;
    state.totalTimedOut = 0;
    state.totalUnavailable = 0;
    state.totalCancelled = 0;
    state.totalRetries = 0;
    state.totalDeduped = 0;
    state.maxObservedQueueDepth = 0;
    state.waitMsSamples.length = 0;
    state.execMsSamples.length = 0;
  }

  return { recordScheduled, recordQueueDepth, recordDeduped, recordCancelled, recordRetry, recordCompleted, snapshot, reset };
}

module.exports = { createSchedulerMetrics };
