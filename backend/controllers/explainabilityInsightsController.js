const explainabilityInsightsService = require("../services/explainabilityInsightsService");

async function getExplainabilityInsights(req, res, next) {
  try {
    res.json(await explainabilityInsightsService.getExplainabilityInsights());
  } catch (error) {
    next(error);
  }
}

module.exports = { getExplainabilityInsights };
