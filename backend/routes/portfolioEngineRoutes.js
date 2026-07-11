const express = require("express");
const {
  getPortfolioSummary,
  placeOrder,
  getTradeHistory,
  getTransactionLog,
  getPerformanceTimeline,
  capturePerformanceSnapshot,
  resetPortfolio,
} = require("../controllers/portfolioEngineController");

const router = express.Router();

router.get("/", getPortfolioSummary);
router.post("/orders", placeOrder);
router.get("/trades", getTradeHistory);
router.get("/transactions", getTransactionLog);
router.get("/performance", getPerformanceTimeline);
router.post("/performance/snapshot", capturePerformanceSnapshot);
router.post("/reset", resetPortfolio);

module.exports = router;
