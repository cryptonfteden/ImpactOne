const express = require("express");
const controller = require("../controllers/performanceMetricsController");

const router = express.Router();
router.get("/", controller.getPerformanceMetrics);
router.post("/client-timing", controller.recordClientTiming);
module.exports = router;
