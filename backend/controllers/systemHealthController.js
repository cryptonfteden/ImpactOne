const systemHealthService = require("../services/systemHealthService");

async function getSystemHealth(req, res, next) {
  try {
    res.json(await systemHealthService.getSystemHealth());
  } catch (error) {
    next(error);
  }
}

module.exports = { getSystemHealth };
