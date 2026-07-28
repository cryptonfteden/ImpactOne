const { registerAllAgents } = require("../services/agentOrchestrator/registry");
const { runObserved } = require("../services/agentObservability/observableOrchestrator");

registerAllAgents();

function handleKnownError(error, res, next) {
  if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
  return next(error);
}

async function getStockIntelligence(req, res, next) {
  try {
    // Every real request now also records one execution per agent to the
    // AgentExecutionLog (AGENT-OBSERVABILITY-001) — the report returned
    // to the client is byte-identical to what agentOrchestrator.run()
    // itself produces; observability is a side effect, never a change
    // to the response shape.
    const { report } = await runObserved(req.params.symbol);
    res.json(report);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

module.exports = { getStockIntelligence };
