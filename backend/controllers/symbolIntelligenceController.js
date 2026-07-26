const symbolIntelligenceService = require("../services/symbolIntelligenceService");

function handleKnownError(error, res, next) {
  if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
  return next(error);
}

async function getSymbolIntelligence(req, res, next) {
  try {
    const result = await symbolIntelligenceService.getSymbolIntelligence(req.params.symbol, { betaUserId: req.betaUserId });
    res.json(result);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

module.exports = { getSymbolIntelligence };
