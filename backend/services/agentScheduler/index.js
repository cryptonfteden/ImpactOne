// Phase AGENT-SCHEDULER-001 — barrel export for the scheduling layer.
const schedulerConfig = require("./schedulerConfig");
const { computeBackoffDelayMs, abortableDelay } = require("./retryBackoff");
const { CancellationToken } = require("./cancellationToken");
const { ExecutionQueue } = require("./executionQueue");
const { createSchedulerMetrics } = require("./schedulerMetrics");
const { createAgentScheduler, sharedScheduler } = require("./agentScheduler");

module.exports = {
  ...schedulerConfig,
  computeBackoffDelayMs,
  abortableDelay,
  CancellationToken,
  ExecutionQueue,
  createSchedulerMetrics,
  createAgentScheduler,
  sharedScheduler,
};
