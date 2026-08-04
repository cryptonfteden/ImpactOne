const express = require("express");
const { getAccount, upgrade, cancel } = require("../controllers/accountController");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

// Phase COMMERCIAL-MVP-001 — every real account-management endpoint
// requires a real, verified session; there is no unauthenticated path
// through this router at all.
router.use(requireAuth);

router.get("/", getAccount);
router.post("/upgrade", upgrade);
router.post("/cancel", cancel);

module.exports = router;
