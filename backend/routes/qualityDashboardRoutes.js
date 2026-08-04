const express = require("express");
const { getQualityDashboard, getLearningSignals } = require("../controllers/qualityDashboardController");

const router = express.Router();

router.get("/", getQualityDashboard);
router.get("/learning-signals", getLearningSignals);

module.exports = router;
