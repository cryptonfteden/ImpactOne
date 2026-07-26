const adminDashboardService = require("../services/adminDashboardService");

async function getAdminDashboard(req, res, next) {
  try {
    res.json(await adminDashboardService.getAdminDashboard());
  } catch (error) {
    next(error);
  }
}

module.exports = { getAdminDashboard };
