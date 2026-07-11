const autonomousRecommendationRepository = require("../services/autonomousRecommendationRepository");
const autonomousRecommendationEngine = require("../services/autonomousRecommendationEngine");
const schedulerService = require("../services/schedulerService");

function handleKnownError(error, res, next) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  return next(error);
}

async function listRecommendations(req, res, next) {
  try {
    const { status, symbol } = req.query;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const recommendations = status || symbol
      ? await autonomousRecommendationRepository.listAll({ status, symbol, limit })
      : await autonomousRecommendationRepository.listActive({ limit });

    res.json({ recommendations });
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function getRecommendation(req, res, next) {
  try {
    const recommendation = await autonomousRecommendationRepository.getById(req.params.id);
    if (!recommendation) {
      return res.status(404).json({ error: "Recommendation not found." });
    }
    res.json(recommendation);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function runRecommendationEngine(req, res, next) {
  try {
    const result = await autonomousRecommendationEngine.runOnce();
    res.status(201).json(result);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function getEngineStatus(req, res, next) {
  try {
    const [status, latestRunLog] = await Promise.all([
      Promise.resolve(schedulerService.getStatus()),
      autonomousRecommendationRepository.getLatestRunLog(),
    ]);
    res.json({ ...status, latestRunLog });
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

module.exports = {
  listRecommendations,
  getRecommendation,
  runRecommendationEngine,
  getEngineStatus,
};
