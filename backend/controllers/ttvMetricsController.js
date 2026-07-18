const ttvMetricsService = require("../services/ttvMetricsService");

async function getTimeToValueMetrics(req, res, next) {
  try {
    const metrics = await ttvMetricsService.computeTimeToValueMetrics();
    res.json(metrics);
  } catch (error) {
    next(error);
  }
}

module.exports = { getTimeToValueMetrics };
