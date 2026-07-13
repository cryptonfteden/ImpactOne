const express = require("express");
const {
  listProviders,
  getProviderHealth,
  getProviderMetrics,
  getProviderDiagnostics,
  runProvider,
} = require("../controllers/providerController");

const router = express.Router();

router.get("/", listProviders);
router.get("/:providerId/health", getProviderHealth);
router.get("/:providerId/metrics", getProviderMetrics);
router.get("/:providerId/diagnostics", getProviderDiagnostics);
router.post("/:providerId/run", runProvider);

module.exports = router;
