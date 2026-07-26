const newsSourceScoringService = require("../services/newsSourceScoringService");

function handleKnownError(error, res, next) {
  if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
  return next(error);
}

async function getSourceScore(req, res, next) {
  try {
    res.json(await newsSourceScoringService.getSourceScore(req.params.sourceName));
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function listSourceScores(req, res, next) {
  try {
    res.json(await newsSourceScoringService.listSourceScores());
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

module.exports = { getSourceScore, listSourceScores };
