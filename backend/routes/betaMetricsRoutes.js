const express = require("express");
const controller = require("../controllers/betaMetricsController");

const router = express.Router();
router.get("/", controller.getBetaMetrics);
module.exports = router;
