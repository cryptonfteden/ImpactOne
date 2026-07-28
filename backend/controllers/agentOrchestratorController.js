const { registerAllAgents } = require("../services/agentOrchestrator/registry");
const { runObserved } = require("../services/agentObservability/observableOrchestrator");
const { resolveRequestCorrelationId, CORRELATION_HEADER } = require("../services/agentObservability/correlationModel");
const { sharedRequestFailureLog } = require("../services/agentObservability/requestFailureLog");

registerAllAgents();

const ROUTE = "GET /v2/agent-orchestrator/:symbol";

function handleKnownError(error, res, next) {
  if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
  return next(error);
}

async function getStockIntelligence(req, res, next) {
  // Phase PLATFORM-HARDENING-001 — correlation ID propagation
  // end-to-end: honor an inbound id if the caller already has one,
  // otherwise mint one; always echo it back so the caller can look up
  // this exact request later via /v2/agent-observability or the
  // diagnostics endpoint. Response shape is unchanged — only a response
  // header is added.
  const correlationId = resolveRequestCorrelationId(req);
  res.set(CORRELATION_HEADER, correlationId);

  try {
    // Every real request now also records one execution per agent to the
    // AgentExecutionLog (AGENT-OBSERVABILITY-001) — the report returned
    // to the client is byte-identical to what agentOrchestrator.run()
    // itself produces; observability is a side effect, never a change
    // to the response shape.
    const { report } = await runObserved(req.params.symbol, {}, { correlationId });
    res.json(report);
  } catch (error) {
    // Request-level failure logging (PLATFORM-HARDENING-001) — distinct
    // from AgentExecutionLog's per-agent records: this is "did the
    // request itself fail, and why", tagged with the same correlationId.
    sharedRequestFailureLog.append({
      correlationId,
      route: ROUTE,
      symbol: req.params.symbol,
      statusCode: error.statusCode || 500,
      message: error.message,
    });
    handleKnownError(error, res, next);
  }
}

module.exports = { getStockIntelligence };
