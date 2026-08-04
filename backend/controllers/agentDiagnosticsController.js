// Phase PLATFORM-HARDENING-001 — "Runtime diagnostics endpoint": one
// consolidated, read-only JSON snapshot of the Agent Platform's current
// operational state — scheduler configuration and metrics, health-cache
// hit rate, observability storage size/retention, recent request
// failures, and basic process vitals. Infrastructure only: no
// dashboard, no UI, plain JSON for an engineer (or a future dashboard)
// to read.
const os = require("node:os");
const { sharedScheduler } = require("../services/agentScheduler/agentScheduler");
const { sharedLog } = require("../services/agentObservability/agentExecutionLog");
const { sharedRequestFailureLog } = require("../services/agentObservability/requestFailureLog");

function getDiagnostics(req, res) {
  const memory = process.memoryUsage();

  return res.json({
    generatedAt: new Date().toISOString(),
    process: {
      uptimeSeconds: Math.round(process.uptime()),
      nodeVersion: process.version,
      platform: os.platform(),
      memory: {
        rssBytes: memory.rss,
        heapUsedBytes: memory.heapUsed,
        heapTotalBytes: memory.heapTotal,
      },
    },
    scheduler: {
      config: sharedScheduler.getConfig(),
      metrics: sharedScheduler.getMetrics(),
      healthCache: sharedScheduler.getHealthCacheStats(),
    },
    observability: {
      executionLog: {
        size: sharedLog.size(),
        maxRecords: sharedLog.getMaxRecords(),
      },
      requestFailureLog: {
        size: sharedRequestFailureLog.size(),
        maxRecords: sharedRequestFailureLog.getMaxRecords(),
        recent: sharedRequestFailureLog.recent({ limit: 20 }),
      },
    },
  });
}

module.exports = { getDiagnostics };
