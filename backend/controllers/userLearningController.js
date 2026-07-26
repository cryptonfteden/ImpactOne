const userLearningService = require("../services/userLearningService");

function handleKnownError(error, res, next) {
  if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
  return next(error);
}

async function getUserLearningProfile(req, res, next) {
  try {
    res.json(await userLearningService.getUserLearningProfile(req.betaUserId));
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

module.exports = { getUserLearningProfile };
