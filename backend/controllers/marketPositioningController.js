const marketPositioningService = require("../services/marketPositioningService");
const opportunityScoreService = require("../services/opportunityScoreService");
const alertTypeRegistry = require("../services/alertTypeRegistry");

function handleKnownError(error, res, next) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  return next(error);
}

async function getMarketPositioning(req, res, next) {
  try {
    const symbols = String(req.query.symbols || "").split(",").map((value) => value.trim()).filter(Boolean);
    const result = await marketPositioningService.getMarketPositioning({ symbols });
    res.json(result);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function getOpportunityScore(req, res, next) {
  try {
    const result = await opportunityScoreService.getOpportunityScore(req.params.symbol);
    res.json(result);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function listAlertTypes(req, res, next) {
  try {
    res.json({ alertTypes: alertTypeRegistry.listAlertTypes() });
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

module.exports = { getMarketPositioning, getOpportunityScore, listAlertTypes };
