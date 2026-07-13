const providerRegistry = require("../services/providers/providerRegistry");
const providerHealthService = require("../services/providerHealthService");
const providerIngestionService = require("../services/providerIngestionService");
const providerMetricsService = require("../services/providerMetricsService");
const providerDiagnosticsService = require("../services/providerDiagnosticsService");

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

async function getProviderMetrics(req, res, next) {
  try {
    const metrics = await providerMetricsService.getMetricsForProvider(req.params.providerId);
    if (!metrics) {
      return res.status(404).json({ error: `Unknown provider: ${req.params.providerId}` });
    }
    res.json(metrics);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function getProviderDiagnostics(req, res, next) {
  try {
    const diagnostics = await providerDiagnosticsService.getDiagnosticsForProvider(req.params.providerId);
    if (!diagnostics) {
      return res.status(404).json({ error: `Unknown provider: ${req.params.providerId}` });
    }
    res.json(diagnostics);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

function getProviderMetadata(req, res) {
  const provider = providerRegistry.getProvider(req.params.providerId);
  if (!provider) {
    return res.status(404).json({ error: `Unknown provider: ${req.params.providerId}` });
  }
  const { providerId, label, sourceType, category, defaultThemes, rateLimit } = provider;
  res.json({ providerId, label, sourceType, category, defaultThemes, rateLimit });
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

module.exports = {
  listProviders,
  getProviderHealth,
  getProviderMetrics,
  getProviderDiagnostics,
  getProviderMetadata,
  runProvider,
};
