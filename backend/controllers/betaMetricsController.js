const betaMetricsService = require("../services/betaMetricsService");

async function getBetaMetrics(req, res, next) {
  try {
    res.json(await betaMetricsService.getBetaMetrics());
  } catch (error) {
    next(error);
  }
}

module.exports = { getBetaMetrics };
