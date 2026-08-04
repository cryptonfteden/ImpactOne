const featureFlagService = require("../services/featureFlagService");

function handleKnownError(error, res, next) {
  if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
  return next(error);
}

async function listFlags(req, res, next) {
  try {
    res.json({ flags: await featureFlagService.listFlags() });
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function setFlag(req, res, next) {
  try {
    const { mode, enabledForUsers, description } = req.body || {};
    const flag = await featureFlagService.setFlag(req.params.key, { mode, enabledForUsers, description });
    res.json(flag);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function evaluateFlag(req, res, next) {
  try {
    const enabled = await featureFlagService.isFeatureEnabled(req.params.key, req.betaUserId);
    res.json({ key: req.params.key, enabled });
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

module.exports = { listFlags, setFlag, evaluateFlag };
