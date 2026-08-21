const express = require("express");
const {
  getPortfolioSummary,
  placeOrder,
  openPaperPosition,
  closePaperPosition,
  getTradeHistory,
  getTransactionLog,
  getPerformanceTimeline,
  capturePerformanceSnapshot,
  getPerformanceDelta,
  resetPortfolio,
} = require("../controllers/portfolioEngineController");

const router = express.Router();

router.get("/", getPortfolioSummary);
router.post("/orders", placeOrder);
router.post("/positions", openPaperPosition);
router.post("/positions/close", closePaperPosition);
router.get("/trades", getTradeHistory);
router.get("/transactions", getTransactionLog);
router.get("/performance", getPerformanceTimeline);
router.post("/performance/snapshot", capturePerformanceSnapshot);
router.get("/performance/delta", getPerformanceDelta);
router.post("/reset", resetPortfolio);

module.exports = router;
