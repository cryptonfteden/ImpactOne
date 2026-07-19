const express = require("express");
const controller = require("../controllers/committeeIntelligenceController");

const router = express.Router();

// Sprint 38 — Investment Intelligence Committee. Read-only evidence-matrix-
// driven analysis layer, distinct from the legacy /committee/* routes'
// committee-debate system used in the live recommendation flow. The
// canonical recommendation system remains the only verdict source.
router.get("/:symbol", controller.convene);

module.exports = router;
