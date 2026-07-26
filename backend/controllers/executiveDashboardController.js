const executiveDashboardService = require("../services/executiveDashboardService");

async function getExecutiveDashboard(req, res, next) {
  try {
    res.json(await executiveDashboardService.getExecutiveDashboard(req.betaUserId));
  } catch (error) {
    next(error);
  }
}

module.exports = { getExecutiveDashboard };
