// Phase AGENT-OBSERVABILITY-001 — a developer-only endpoint exposing the
// AgentExecutionLog. This is infrastructure visibility, not a product
// surface: no dashboard, no UI, just the raw execution trace for a
// symbol so an engineer (or a future dashboard) can inspect it.
const { sharedLog } = require("../services/agentObservability/agentExecutionLog");
const { buildTimeline } = require("../services/agentObservability/executionTimeline");
const { collectMetrics } = require("../services/agentObservability/metricsCollector");
const { resolveRequestCorrelationId, CORRELATION_HEADER } = require("../services/agentObservability/correlationModel");
const { sharedRequestFailureLog } = require("../services/agentObservability/requestFailureLog");

const ROUTE = "GET /v2/agent-observability/:symbol";

function getExecutionTrace(req, res) {
  // Phase PLATFORM-HARDENING-001 — same end-to-end correlation
  // propagation as the orchestrator endpoint: honor an inbound id,
  // always echo one back.
  const correlationId = resolveRequestCorrelationId(req);
  res.set(CORRELATION_HEADER, correlationId);

  const symbol = String(req.params.symbol || "").trim().toUpperCase();
  if (!symbol) {
    sharedRequestFailureLog.append({ correlationId, route: ROUTE, statusCode: 400, message: "A stock symbol is required." });
    return res.status(400).json({ error: "A stock symbol is required." });
  }

  // Optional ?correlationId= narrows the trace to exactly one prior
  // request's executions (cross-referencing the id this same endpoint,
  // or /v2/agent-orchestrator, already returned) — omitting it preserves
  // the original behavior of returning every record for the symbol.
  const filterCorrelationId = typeof req.query?.correlationId === "string" ? req.query.correlationId : null;
  const records = filterCorrelationId
    ? sharedLog.getBySymbol(symbol).filter((record) => record.correlationId === filterCorrelationId)
    : sharedLog.getBySymbol(symbol);
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
