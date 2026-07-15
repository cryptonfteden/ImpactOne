const qualityDashboardService = require("../services/qualityDashboardService");

async function getQualityDashboard(req, res, next) {
  try {
    const dashboard = await qualityDashboardService.computeQualityDashboard();
    res.json(dashboard);
  } catch (error) {
    next(error);
  }
}

module.exports = { getQualityDashboard };
