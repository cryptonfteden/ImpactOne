const express = require("express");
const { listPlans, webhook, providerInfo } = require("../controllers/billingController");

const router = express.Router();

router.get("/plans", listPlans);
router.get("/provider", providerInfo);
// Real webhook signature verification happens inside the configured
// billing provider (see stripeBillingProvider.js) — never gated by
// requireAuth, since a webhook call comes from the vendor, not a
// logged-in user.
router.post("/webhook", webhook);

module.exports = router;
