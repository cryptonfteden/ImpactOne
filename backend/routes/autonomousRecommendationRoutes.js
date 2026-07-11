const express = require("express");
const {
  listRecommendations,
  getRecommendation,
  runRecommendationEngine,
  getEngineStatus,
} = require("../controllers/autonomousRecommendationController");

const router = express.Router();

router.get("/", listRecommendations);
router.get("/status", getEngineStatus);
router.get("/:id", getRecommendation);
router.post("/run", runRecommendationEngine);

module.exports = router;
