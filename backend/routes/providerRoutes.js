const express = require("express");
const { listProviders, getProviderHealth, runProvider } = require("../controllers/providerController");

const router = express.Router();

router.get("/", listProviders);
router.get("/:providerId/health", getProviderHealth);
router.post("/:providerId/run", runProvider);

module.exports = router;
