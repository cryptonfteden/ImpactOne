const express = require("express");
const controller = require("../controllers/marketPositioningController");
const chartController = require("../controllers/chartController");

const router = express.Router();

router.get("/positioning", controller.getMarketPositioning);
router.get("/opportunity-score/:symbol", controller.getOpportunityScore);
router.get("/alert-types", controller.listAlertTypes);
router.get("/chart/:symbol", chartController.getChartData);

module.exports = router;
