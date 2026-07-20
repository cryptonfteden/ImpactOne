const express = require("express");
const { getNewsController } = require("../controllers/newsController");
const { getWatchlist } = require("../controllers/watchlistController");
const { getMarket } = require("../controllers/marketController");
const { analyze } = require("../controllers/aiController");
const { getComparison } = require("../controllers/comparisonController");
const { getPortfolio } = require("../controllers/portfolioController");
const { getQuoteController } = require("../controllers/quoteController");
const { analyzeCommittee, getCommitteeTrackRecordController } = require("../controllers/committeeController");
const { getHomeSummary } = require("../controllers/homeSummaryController");
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
const portfolioEngineRoutes = require("./portfolioEngineRoutes");
const chatRoutes = require("./chatRoutes");
const autonomousRecommendationRoutes = require("./autonomousRecommendationRoutes");
const investorProfileRoutes = require("./investorProfileRoutes");
const themeRoutes = require("./themeRoutes");
const providerRoutes = require("./providerRoutes");
const qualityDashboardRoutes = require("./qualityDashboardRoutes");
const outcomeIntelligenceRoutes = require("./outcomeIntelligenceRoutes");
const calibrationReportRoutes = require("./calibrationReportRoutes");
const personalProgressRoutes = require("./personalProgressRoutes");
const investorMemoryRoutes = require("./investorMemoryRoutes");
const analyticsRoutes = require("./analyticsRoutes");
const marketIntelligenceRoutes = require("./marketIntelligenceRoutes");
const committeeIntelligenceRoutes = require("./committeeIntelligenceRoutes");
const explainabilityRoutes = require("./explainabilityRoutes");

const router = express.Router();

router.get("/news", getNewsController);
router.get("/watchlist", getWatchlist);
router.get("/market", getMarket);
router.get("/ai/analyze", analyze);
router.post("/ai/analyze", analyze);
router.get("/committee/analyze", analyzeCommittee);
router.post("/committee/analyze", analyzeCommittee);
router.get("/committee/track-record", getCommitteeTrackRecordController);
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
router.use("/v2/portfolio", portfolioEngineRoutes);
router.use("/v2/recommendations", autonomousRecommendationRoutes);
router.use("/v2/investor-profile", investorProfileRoutes);
router.get("/v2/home-summary", getHomeSummary);
router.use("/v2/themes", themeRoutes);
router.use("/v2/providers", providerRoutes);
// Sprint 29 — internal only, developer-mode dashboard. Not linked from any
// public navigation; the frontend only reaches it from the VITE_DEV_
// CONSOLE-gated IntelligenceConsoleScreen (see providerRoutes' own gating
// precedent).
router.use("/v2/quality-dashboard", qualityDashboardRoutes);
// Sprint 31 — Outcome Intelligence, Priority 4. Public (not dev-console-
// gated): lessons learned are meant for the real Recommendations screen.
router.use("/v2/lessons", outcomeIntelligenceRoutes);
router.use("/v2/calibration-reports", calibrationReportRoutes);
router.use("/v2/personal-progress", personalProgressRoutes);
router.use("/v2/investor-memory", investorMemoryRoutes);
// Sprint 35 Priority 5 — Private Beta Telemetry. Genuinely anonymous
// (see analyticsService.js); fire-and-forget from the frontend, so this
// endpoint intentionally never returns an error status the caller would
// need to handle.
router.use("/v2/analytics", analyticsRoutes);
// Sprint 37 — Market Intelligence Source Layer. Read-only aggregation/
// normalization views (see each service's safety-critical header); the
// canonical recommendation system remains the only verdict source.
router.use("/v2/market-intelligence", marketIntelligenceRoutes);
// Sprint 38 — Investment Intelligence Committee. Distinct from the legacy
// /committee/* routes above (Sprint 16/18A committee-debate system, wired
// into the live recommendation flow) — this is a new, read-only, evidence-
// matrix-driven analysis layer that never feeds a verdict.
router.use("/v2/committee-intelligence", committeeIntelligenceRoutes);
// Sprint 39 — Explainability Layer. Read-only: explains a DecisionTrace
// plus a live re-convened committee; never a second recommendation path.
router.use("/v2/explainability", explainabilityRoutes);
router.use("/chat", chatRoutes);

module.exports = router;
