const express = require("express");
const controller = require("../controllers/explainabilityInsightsController");

const router = express.Router();
router.get("/", controller.getExplainabilityInsights);
module.exports = router;
