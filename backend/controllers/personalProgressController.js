const personalProgressService = require("../services/personalProgressService");

async function getPersonalProgress(req, res, next) {
  try {
    const progress = await personalProgressService.computePersonalProgress();
    res.json(progress);
  } catch (error) {
    next(error);
  }
}

module.exports = { getPersonalProgress };
