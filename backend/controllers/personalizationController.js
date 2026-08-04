const personalizationService = require("../services/personalizationService");

function handleKnownError(error, res, next) {
  if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
  return next(error);
}

async function getPersonalizationProfile(req, res, next) {
  try {
    res.json(await personalizationService.getPersonalizationProfile(req.betaUserId));
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

module.exports = { getPersonalizationProfile };
