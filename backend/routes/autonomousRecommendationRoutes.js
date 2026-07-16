const express = require("express");
const {
  listRecommendations,
  getRecommendation,
  runRecommendationEngine,
  getEngineStatus,
  getRecommendationDecisionTrace,
  submitRecommendationFeedback,
  listRecommendationFeedback,
  recordRecommendationView,
} = require("../controllers/autonomousRecommendationController");
const { getDecisionReview } = require("../controllers/decisionReviewController");

const router = express.Router();

router.get("/", listRecommendations);
router.get("/status", getEngineStatus);
router.get("/:id/decision-trace", getRecommendationDecisionTrace);
router.get("/:id/feedback", listRecommendationFeedback);
router.post("/:id/feedback", submitRecommendationFeedback);
router.post("/:id/view", recordRecommendationView);
router.get("/:id/review", getDecisionReview);
router.get("/:id", getRecommendation);
router.post("/run", runRecommendationEngine);

module.exports = router;
