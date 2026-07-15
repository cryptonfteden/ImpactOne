const express = require("express");
const { getQualityDashboard } = require("../controllers/qualityDashboardController");

const router = express.Router();

router.get("/", getQualityDashboard);

module.exports = router;
