const express = require("express");
const controller = require("../controllers/aiPerformanceDashboardController");

const router = express.Router();
router.get("/", controller.getAiPerformanceDashboard);
module.exports = router;
