const express = require("express");
const controller = require("../controllers/qualityPlatformController");

const router = express.Router();

// Sprint 42 — Intelligence Quality Platform. Internal analytics only, no
// public UI yet — every route is read-only.
router.get("/recommendations/:recommendationId/lifecycle", controller.getRecommendationLifecycle);
router.get("/committee-scorecard", controller.getCommitteeScorecard);
router.get("/committee-scorecard/rollup", controller.getCommitteeScorecardRollup);
router.get("/cio-scorecard", controller.getCioScorecard);
router.get("/evidence-scorecard", controller.getEvidenceScorecard);

module.exports = router;
