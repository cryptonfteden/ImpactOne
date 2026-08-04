const express = require("express");
const controller = require("../controllers/explainabilityController");

const router = express.Router();

// Sprint 39 — Explainability Layer. Read-only: explains a past
// recommendation's DecisionTrace + a live re-convened committee, and runs
// internal what-if analysis. Never a second recommendation/verdict path.
router.get("/recommendations/:recommendationId", controller.explainRecommendation);
router.get("/what-if/:symbol", controller.whatIf);

module.exports = router;
