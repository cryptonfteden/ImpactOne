const express = require("express");
const { getNewsController } = require("../controllers/newsController");
const { getWatchlist } = require("../controllers/watchlistController");
const { getMarket } = require("../controllers/marketController");
const { analyze } = require("../controllers/aiController");
const { getComparison } = require("../controllers/comparisonController");
const { getPortfolio } = require("../controllers/portfolioController");
const { getQuoteController } = require("../controllers/quoteController");
const {
	getCot,
	getPolymarket,
	getMacro,
	getSec,
	getCongress,
	getEvents,
	getSummary,
} = require("../controllers/altDataController");
const intelligenceRoutes = require("./intelligenceRoutes");

const router = express.Router();

router.get("/news", getNewsController);
router.get("/watchlist", getWatchlist);
router.get("/market", getMarket);
router.get("/ai/analyze", analyze);
router.post("/ai/analyze", analyze);
router.get("/compare", getComparison);
router.get("/portfolio", getPortfolio);
router.get("/quote", getQuoteController);
router.get("/alt-data/cot", getCot);
router.get("/alt-data/polymarket", getPolymarket);
router.get("/alt-data/macro", getMacro);
router.get("/alt-data/sec", getSec);
router.get("/alt-data/congress", getCongress);
router.get("/alt-data/events", getEvents);
router.get("/alt-data/summary", getSummary);
router.use("/intelligence", intelligenceRoutes);

module.exports = router;
