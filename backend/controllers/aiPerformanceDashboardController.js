const aiPerformanceDashboardService = require("../services/aiPerformanceDashboardService");

async function getAiPerformanceDashboard(req, res, next) {
  try {
    res.json(await aiPerformanceDashboardService.getAiPerformanceDashboard());
  } catch (error) {
    next(error);
  }
}

module.exports = { getAiPerformanceDashboard };
