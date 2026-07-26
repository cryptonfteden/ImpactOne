const express = require("express");
const controller = require("../controllers/marketSentimentController");

const router = express.Router();
router.get("/overview", controller.getOverview);
module.exports = router;
