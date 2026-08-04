// Phase UNIFIED-STOCK-INTELLIGENCE-001 — a thin controller exposing the
// unified engine over HTTP, following the exact same correlation-
// propagation and request-failure-logging pattern
// PLATFORM-HARDENING-001 established for agentOrchestratorController.js.
const { generateUnifiedIntelligence } = require("../services/unifiedStockIntelligence/unifiedStockIntelligenceEngine");
const { resolveRequestCorrelationId, CORRELATION_HEADER } = require("../services/agentObservability/correlationModel");
const { sharedRequestFailureLog } = require("../services/agentObservability/requestFailureLog");

const ROUTE = "GET /v2/unified-stock-intelligence/:symbol";

function handleKnownError(error, res, next) {
  if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
  return next(error);
}

async function getUnifiedIntelligence(req, res, next) {
  const correlationId = resolveRequestCorrelationId(req);
  res.set(CORRELATION_HEADER, correlationId);

  const symbol = String(req.params.symbol || "").trim();
  if (!symbol) {
    sharedRequestFailureLog.append({ correlationId, route: ROUTE, symbol: req.params.symbol, statusCode: 400, message: "A stock symbol is required." });
    return res.status(400).json({ error: "A stock symbol is required." });
  }

  try {
    const report = await generateUnifiedIntelligence(symbol, { correlationId });
    res.json(report);
  } catch (error) {
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

module.exports = { getUnifiedIntelligence };
