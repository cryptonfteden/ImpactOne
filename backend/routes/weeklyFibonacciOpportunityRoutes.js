const express = require("express");
const controller = require("../controllers/weeklyFibonacciOpportunityController");

const router = express.Router();
router.get("/", controller.listWeeklyFibonacciOpportunities);
module.exports = router;
