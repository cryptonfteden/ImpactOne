const express = require("express");
const {
  intelligenceAnalyze,
  intelligenceScenario,
  intelligenceImpact,
  intelligenceHistory,
  intelligencePortfolio,
} = require("../controllers/intelligenceController");
const { getAutonomousDailyBrief } = require("../controllers/dailyBriefController");
const {
  getAutonomousOverviewController,
  getLiveFeed,
  getChangeWindows,
  getWatchlistPriority,
  getGlobalMap,
  getDecisionCenter,
} = require("../controllers/autonomousMarketController");

const router = express.Router();

router.get("/analyze", intelligenceAnalyze);
router.post("/analyze", intelligenceAnalyze);
router.get("/scenario", intelligenceScenario);
router.post("/scenario", intelligenceScenario);
router.get("/impact", intelligenceImpact);
router.post("/impact", intelligenceImpact);
router.get("/history", intelligenceHistory);
router.post("/history", intelligenceHistory);
router.post("/portfolio", intelligencePortfolio);
router.get("/daily-brief", getAutonomousDailyBrief);
router.post("/daily-brief", getAutonomousDailyBrief);
router.get("/overview", getAutonomousOverviewController);
router.post("/overview", getAutonomousOverviewController);
router.get("/live-feed", getLiveFeed);
router.get("/changes", getChangeWindows);
router.get("/watchlist-priority", getWatchlistPriority);
router.get("/global-map", getGlobalMap);
router.get("/decision-center", getDecisionCenter);

module.exports = router;
