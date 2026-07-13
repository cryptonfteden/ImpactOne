const providerRegistry = require("../services/providers/providerRegistry");
const providerHealthService = require("../services/providerHealthService");
const providerIngestionService = require("../services/providerIngestionService");

function handleKnownError(error, res, next) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  return next(error);
}

async function listProviders(req, res, next) {
  try {
    const health = await providerHealthService.getHealthSummary();
    res.json({ providers: health });
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function getProviderHealth(req, res, next) {
  try {
    const health = await providerHealthService.getHealthForProvider(req.params.providerId);
    if (!health) {
      return res.status(404).json({ error: `Unknown provider: ${req.params.providerId}` });
    }
    res.json(health);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function runProvider(req, res, next) {
  try {
    if (!providerRegistry.getProvider(req.params.providerId)) {
      return res.status(404).json({ error: `Unknown provider: ${req.params.providerId}` });
    }
    const result = await providerIngestionService.runProviderIngestion(req.params.providerId);
    res.json(result);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

module.exports = { listProviders, getProviderHealth, runProvider };
