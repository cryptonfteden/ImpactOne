// Phase AGENT-OBSERVABILITY-001 — barrel export for the observability layer.
const correlationModel = require("./correlationModel");
const timingUtils = require("./timingUtils");
const failureTaxonomy = require("./failureTaxonomy");
const { createAgentExecutionLog, sharedLog, DEFAULT_MAX_RECORDS } = require("./agentExecutionLog");
const metricsCollector = require("./metricsCollector");
const executionTimeline = require("./executionTimeline");
const { runObserved } = require("./observableOrchestrator");

module.exports = {
  ...correlationModel,
  ...timingUtils,
  ...failureTaxonomy,
  createAgentExecutionLog,
  sharedLog,
  DEFAULT_MAX_RECORDS,
  ...metricsCollector,
  ...executionTimeline,
  runObserved,
};
