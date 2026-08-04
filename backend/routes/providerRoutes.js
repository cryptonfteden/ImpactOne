const express = require("express");
const {
  listProviders,
  getProviderHealth,
  getProviderMetrics,
  getProviderDiagnostics,
  getProviderMetadata,
  runProvider,
  getProviderCacheMetrics,
} = require("../controllers/providerController");

const router = express.Router();

router.get("/", listProviders);
// Phase REDIS-CACHE-001 — a single-segment static path, placed before
// the `/:providerId/...` routes below so it can never be shadowed by
// (or shadow) a real provider id.
router.get("/cache-metrics", getProviderCacheMetrics);
router.get("/:providerId/health", getProviderHealth);
router.get("/:providerId/metrics", getProviderMetrics);
router.get("/:providerId/diagnostics", getProviderDiagnostics);
router.get("/:providerId/metadata", getProviderMetadata);
router.post("/:providerId/run", runProvider);

module.exports = router;
