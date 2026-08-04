const express = require("express");
const controller = require("../controllers/recommendationQualityController");

const router = express.Router();
router.get("/model-confidence", controller.getModelConfidenceScore);
router.get("/:recommendationId", controller.getRecommendationQuality);
module.exports = router;
