const express = require("express");
const {
  intelligenceAnalyze,
  intelligenceScenario,
  intelligenceImpact,
  intelligenceHistory,
  intelligencePortfolio,
} = require("../controllers/intelligenceController");

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

module.exports = router;
