// Phase UI-INTEGRATION-001 — the first real HTTP surface for the
// Options Agent (built backend-only in Phase AI-ENGINE-001.1, whose own
// service doc-comments already named these exact routes/verbs but never
// wired them). Thin pass-through only.
const optionsAgentService = require("../services/optionsAgent/optionsAgentService");

function handleKnownError(error, res, next) {
  if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
  return next(error);
}

async function getStatus(req, res, next) {
  try {
    const status = await optionsAgentService.getStatus();
    res.json(status);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function listSignals(req, res, next) {
  try {
    const { symbol, signalType, since, minAnomalyScore, limit } = req.query;
    const result = await optionsAgentService.listSignals({
      symbol: symbol || undefined,
      signalType: signalType || undefined,
      since: since ? new Date(since) : undefined,
      minAnomalyScore: minAnomalyScore ? Number(minAnomalyScore) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(result);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function getSignalById(req, res, next) {
  try {
    const signal = await optionsAgentService.getSignalById(req.params.signalId);
    if (!signal) return res.status(404).json({ error: "Signal not found." });
    res.json(signal);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function getSymbolView(req, res, next) {
  try {
    const view = await optionsAgentService.getSymbolView(req.params.symbol);
    res.json(view);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

module.exports = { getStatus, listSignals, getSignalById, getSymbolView };
