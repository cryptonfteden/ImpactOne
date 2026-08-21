const express = require("express");
const controller = require("../controllers/tradingViewIntegrationController");

const router = express.Router();
router.get("/status", controller.status);
router.get("/signals", controller.signals);
router.post("/webhook", controller.webhook);
router.get("/datafeed/config", controller.datafeedConfig);
router.get("/datafeed/time", controller.datafeedTime);
router.get("/datafeed/search", controller.datafeedSearch);
router.get("/datafeed/symbols", controller.datafeedSymbols);
router.get("/datafeed/history", controller.datafeedHistory);
module.exports = router;
