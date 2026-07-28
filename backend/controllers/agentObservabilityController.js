// Phase AGENT-OBSERVABILITY-001 — a developer-only endpoint exposing the
// AgentExecutionLog. This is infrastructure visibility, not a product
// surface: no dashboard, no UI, just the raw execution trace for a
// symbol so an engineer (or a future dashboard) can inspect it.
const { sharedLog } = require("../services/agentObservability/agentExecutionLog");
const { buildTimeline } = require("../services/agentObservability/executionTimeline");
const { collectMetrics } = require("../services/agentObservability/metricsCollector");

function getExecutionTrace(req, res) {
  const symbol = String(req.params.symbol || "").trim().toUpperCase();
  if (!symbol) {
    return res.status(400).json({ error: "A stock symbol is required." });
  }

  const records = sharedLog.getBySymbol(symbol);
  const timeline = buildTimeline(records);
  const metrics = collectMetrics(records);

  return res.json({
    symbol,
    recordCount: records.length,
    timeline,
    metrics,
  });
}

module.exports = { getExecutionTrace };
