const recommendationQualityService = require("../services/recommendationQualityService");

function handleKnownError(error, res, next) {
  if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
  return next(error);
}

async function getRecommendationQuality(req, res, next) {
  try {
    res.json(await recommendationQualityService.getRecommendationQuality(req.params.recommendationId));
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function getModelConfidenceScore(req, res, next) {
  try {
    res.json(await recommendationQualityService.getModelConfidenceScore());
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

module.exports = { getRecommendationQuality, getModelConfidenceScore };
