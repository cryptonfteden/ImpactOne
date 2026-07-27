const agentOrchestrator = require("../services/agentOrchestrator/agentOrchestrator");
const { registerAllAgents } = require("../services/agentOrchestrator/registry");

registerAllAgents();

function handleKnownError(error, res, next) {
  if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
  return next(error);
}

async function getStockIntelligence(req, res, next) {
  try {
    const report = await agentOrchestrator.run(req.params.symbol);
    res.json(report);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

module.exports = { getStockIntelligence };
