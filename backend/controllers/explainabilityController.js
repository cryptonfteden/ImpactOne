const decisionTraceExplainabilityService = require("../services/explainability/decisionTraceExplainabilityService");
const whatIfService = require("../services/explainability/whatIfService");

async function explainRecommendation(req, res, next) {
  try {
    res.json(await decisionTraceExplainabilityService.explainRecommendationById(req.params.recommendationId));
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    next(error);
  }
}

async function whatIf(req, res, next) {
  try {
    const { symbol } = req.params;
    const { exclude } = req.query;
    res.json(await whatIfService.runWhatIf(symbol, exclude));
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    next(error);
  }
}

module.exports = { explainRecommendation, whatIf };
