const express = require("express");
const { requireApiKey } = require("../middleware/requireApiKey");
const { getNewsController } = require("../controllers/newsController");
const { getWatchlist } = require("../controllers/watchlistController");
const { getMarket } = require("../controllers/marketController");
const { analyze } = require("../controllers/aiController");
const { getComparison } = require("../controllers/comparisonController");
const { getPortfolio } = require("../controllers/portfolioController");
const { getQuoteController, getShortVolumeRangeController } = require("../controllers/quoteController");
const { getQuote } = require("../services/finnhubService");
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
const authRoutes = require("./authRoutes");
const billingRoutes = require("./billingRoutes");
const accountRoutes = require("./accountRoutes");
const qualityDashboardRoutes = require("./qualityDashboardRoutes");
const outcomeIntelligenceRoutes = require("./outcomeIntelligenceRoutes");
const calibrationReportRoutes = require("./calibrationReportRoutes");
const personalProgressRoutes = require("./personalProgressRoutes");
const investorMemoryRoutes = require("./investorMemoryRoutes");
const analyticsRoutes = require("./analyticsRoutes");
const marketIntelligenceRoutes = require("./marketIntelligenceRoutes");
const committeeIntelligenceRoutes = require("./committeeIntelligenceRoutes");
const explainabilityRoutes = require("./explainabilityRoutes");
const qualityPlatformRoutes = require("./qualityPlatformRoutes");
const betaUserRoutes = require("./betaUserRoutes");
const watchlistFolderRoutes = require("./watchlistFolderRoutes");
const priceAlertRoutes = require("./priceAlertRoutes");
const notificationRoutes = require("./notificationRoutes");
const marketPositioningRoutes = require("./marketPositioningRoutes");
const claimsRoutes = require("./claimsRoutes");
const optionsAgentRoutes = require("./optionsAgentRoutes");
const marketSentimentRoutes = require("./marketSentimentRoutes");
const morningBriefRoutes = require("./morningBriefRoutes");
const impactGraphRoutes = require("./impactGraphRoutes");
const decisionCenterRoutes = require("./decisionCenterRoutes");
const workspaceRoutes = require("./workspaceRoutes");
const symbolIntelligenceRoutes = require("./symbolIntelligenceRoutes");
const agentOrchestratorRoutes = require("./agentOrchestratorRoutes");
const agentObservabilityRoutes = require("./agentObservabilityRoutes");
const agentDiagnosticsRoutes = require("./agentDiagnosticsRoutes");
const unifiedStockIntelligenceRoutes = require("./unifiedStockIntelligenceRoutes");
const systemHealthRoutes = require("./systemHealthRoutes");
const decisionTimelineRoutes = require("./decisionTimelineRoutes");
const executiveDashboardRoutes = require("./executiveDashboardRoutes");
const feedbackRoutes = require("./feedbackRoutes");
const errorReportRoutes = require("./errorReportRoutes");
const featureFlagRoutes = require("./featureFlagRoutes");
const adminDashboardRoutes = require("./adminDashboardRoutes");
const betaMetricsRoutes = require("./betaMetricsRoutes");
const performanceMetricsRoutes = require("./performanceMetricsRoutes");
const userLearningRoutes = require("./userLearningRoutes");
const personalizationRoutes = require("./personalizationRoutes");
const recommendationQualityRoutes = require("./recommendationQualityRoutes");
const newsSourceScoringRoutes = require("./newsSourceScoringRoutes");
const explainabilityInsightsRoutes = require("./explainabilityInsightsRoutes");
const marketMemoryRoutes = require("./marketMemoryRoutes");
const aiPerformanceDashboardRoutes = require("./aiPerformanceDashboardRoutes");
const methodologyVersioningRoutes = require("./methodologyVersioningRoutes");
const outcomeFeedbackRoutes = require("./outcomeFeedbackRoutes");
const dynamicSourceScoringRoutes = require("./dynamicSourceScoringRoutes");
const calibrationAnalysisRoutes = require("./calibrationAnalysisRoutes");
const insiderOpportunityRoutes = require("./insiderOpportunityRoutes");
const weeklyFibonacciOpportunityRoutes = require("./weeklyFibonacciOpportunityRoutes");
const strategyLabTraderRoutes = require("./strategyLabTraderRoutes");
const tradingViewIntegrationRoutes = require("./tradingViewIntegrationRoutes");
const dailyAgentPicksRoutes = require("./dailyAgentPicksRoutes");

const router = express.Router();

router.get("/news", getNewsController);
router.get("/watchlist", getWatchlist);
router.get("/market", getMarket);
router.get("/ai/analyze", analyze);
router.post("/ai/analyze", analyze);
router.get("/compare", getComparison);
router.get("/portfolio", getPortfolio);
router.get("/quote", getQuoteController);
router.get("/quote/short-volume", getShortVolumeRangeController);
router.get("/company-logo/:symbol", async (req, res) => {
	const symbol = String(req.params.symbol || "").trim().toUpperCase();
	if (!/^[A-Z0-9.\-]{1,15}$/.test(symbol)) return res.status(400).end();
	try {
		const payload = await getQuote(symbol);
		const logoUrl = String(payload?.quote?.companyLogo || "").trim();
		res.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
		return res.redirect(302, /^https:\/\//i.test(logoUrl) ? logoUrl : `https://images.financialmodelingprep.com/symbol/${encodeURIComponent(symbol)}.png`);
	} catch {
		res.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
		return res.redirect(302, `https://images.financialmodelingprep.com/symbol/${encodeURIComponent(symbol)}.png`);
	}
});
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
// Sprint 38 — Investment Intelligence Committee. Sprint 41 — Committee
// Unification: this is now THE ONE committee, wired into the live
// Recommendation Engine (autonomousRecommendationEngine.js) and /ai/analyze
// (aiController.js) alike. The legacy /committee/* routes (Sprint 16/18A
// committee-debate system) and investmentCommitteeService.js were retired
// this sprint — see SPRINT_41_REPORT.md.
router.use("/v2/committee-intelligence", committeeIntelligenceRoutes);
// Sprint 39 — Explainability Layer. Read-only: explains a DecisionTrace
// plus a live re-convened committee; never a second recommendation path.
router.use("/v2/explainability", explainabilityRoutes);
// Sprint 42 — Intelligence Quality Platform. Internal analytics API
// (lifecycle, committee/CIO/evidence scorecards) — no public UI yet.
router.use("/v2/quality-platform", qualityPlatformRoutes);
// Phase H2 — Beta User Isolation. Resolves a founder-issued invite code
// to a betaUserId; not an auth system (see BETA_USER_ISOLATION_PLAN.md).
router.use("/v2/beta", betaUserRoutes);
// Phase H3 — Watchlist Folders & Price Alerts. All betaUserId-required,
// no legacy global fallback (see schema.prisma's own comment on these
// models).
router.use("/v2/watchlist-folders", watchlistFolderRoutes);
router.use("/v2/price-alerts", priceAlertRoutes);
router.use("/v2/notifications", notificationRoutes);
// Phase X2 — Market Positioning, Opportunity Score, Alert-type
// architecture listing, and Advanced Chart data. Read-only; never
// consulted by the recommendation engine (see marketPositioningService.js
// / opportunityScoreService.js headers).
router.use("/v2/market", marketPositioningRoutes);
// Phase X3 — Impact Graph, Decision Center, Workspace 2.0.
router.use("/v2/impact-graph", impactGraphRoutes);
router.use("/v2/decisions", decisionCenterRoutes);
router.use("/v2/workspaces", workspaceRoutes);
// Phase X5 — Part 3, Market Intelligence Layer. Named "symbol-
// intelligence" to avoid colliding with Sprint 37's already-mounted
// "/v2/market-intelligence" (a distinct, unrelated provider-source
// aggregation system). Pure composition over already-real services — see
// symbolIntelligenceService.js's header and MARKET_INTELLIGENCE_SPEC.md.
router.use("/v2/symbol-intelligence", symbolIntelligenceRoutes);
// Phase AGENT-ORCHESTRATOR-001 — the new, generic parallel-agent engine
// (scheduling/timeout/retry/health/priority/confidence/conflict-
// detection/evidence-merging). A separate, additive endpoint from
// symbol-intelligence above — not wired to replace it in this phase, so
// no existing consumer's behavior changes. See AGENT_ORCHESTRATOR.md.
router.use("/v2/agent-orchestrator", agentOrchestratorRoutes);
router.use("/v2/agent-observability", agentObservabilityRoutes);
router.use("/v2/agent-diagnostics", agentDiagnosticsRoutes);
router.use("/v2/unified-stock-intelligence", unifiedStockIntelligenceRoutes);
// Phase X6 — Part 5, Observability. Read-only structured health status
// for the beta-only Health Dashboard (Part 4). No auth gate here (same
// precedent as /v2/quality-dashboard) — visibility is gated on the
// frontend instead; nothing in the response is sensitive, only
// HEALTHY/WARNING/UNAVAILABLE/UNKNOWN statuses and latencies.
router.use("/v2/system-health", systemHealthRoutes);
// Phase X7 — Part 3, Decision Timeline.
router.use("/v2/decision-timeline", decisionTimelineRoutes);
// Phase X7 — Part 4, Market Dashboard.
router.use("/v2/executive-dashboard", executiveDashboardRoutes);
// Phase X9 — Private Beta Operations Platform.
router.use("/v2/feedback", feedbackRoutes);
router.use("/v2/error-reports", errorReportRoutes);
router.use("/v2/feature-flags", featureFlagRoutes);
// Phase PLATFORM-HARDENING-002 — this route previously had no backend-
// side protection at all (visibility was frontend-only). `requireApiKey`
// gates it for real once an operator sets ADMIN_API_KEY; until then it
// behaves exactly as before (see middleware/requireApiKey.js's own
// backward-compatibility guarantee).
router.use("/v2/admin-dashboard", requireApiKey, adminDashboardRoutes);
router.use("/v2/beta-metrics", betaMetricsRoutes);
router.use("/v2/performance-metrics", performanceMetricsRoutes);
// Phase X10 — Part 1, User Learning Engine (evolving per-user interaction
// profile) and Part 2, Personalization Engine (derived preference model).
// Both read-only, betaUserId-scoped, built on the existing AnalyticsEvent
// substrate — no new tracking pipe.
router.use("/v2/user-learning", userLearningRoutes);
router.use("/v2/personalization", personalizationRoutes);
// Phase X10 — Part 3, Recommendation Quality Engine. Composes existing
// lifecycle/analytics/outcome data; introduces no second recommendation
// path.
router.use("/v2/recommendation-quality", recommendationQualityRoutes);
// Phase X10 — Part 4, News Source Scoring. Dynamic, outcome-informed trust
// score per source — replaces no existing endpoint (scoringVocabulary.js's
// static credibility table remains the live scoring input; this is a new,
// internal, read-only view).
router.use("/v2/news-source-scoring", newsSourceScoringRoutes);
// Phase X10 — Part 5, Explainability Improvement. Read-only aggregation
// over real expand/collapse AnalyticsEvent rows; never edits explanations
// itself.
router.use("/v2/explainability-insights", explainabilityInsightsRoutes);
// Phase X10 — Part 6, Market Memory. Real symbol/sector similarity over
// WorldMemoryRecord — supersedes no route (historicalSimilarityService.js's
// stub was never mounted).
router.use("/v2/market-memory", marketMemoryRoutes);
// Phase X10 — Part 7, AI Performance Dashboard. Internal only — same no-
// auth-gate precedent as /v2/quality-dashboard/admin-dashboard; visibility
// controlled on the frontend (VITE_DEV_CONSOLE gate).
router.use("/v2/ai-performance-dashboard", aiPerformanceDashboardRoutes);
// Phase X11 — Closed Learning Loop. Methodology versioning (Part 3),
// outcome feedback (Part 1), and dynamic source scoring (Part 2) — every
// one read/write-audited, never a second live decision path.
router.use("/v2/methodology-versions", methodologyVersioningRoutes);
router.use("/v2/outcome-feedback", outcomeFeedbackRoutes);
router.use("/v2/dynamic-source-scoring", dynamicSourceScoringRoutes);
// Phase X11 — Part 5, Calibration. Composes the existing Sprint 31
// per-family calibration report with a new confidence-distribution
// reliability breakdown and calibration-drift signal.
router.use("/v2/calibration-analysis", calibrationAnalysisRoutes);
// Daily closed-loop screen: verified SEC Form 4 purchases first, then the
// existing multi-agent committee. Read-only and advisory-only.
router.use("/v2/insider-opportunities", insiderOpportunityRoutes);
router.use("/v2/weekly-fibonacci-opportunities", weeklyFibonacciOpportunityRoutes);
router.use("/v2/strategy-lab", strategyLabTraderRoutes);
router.use("/v2/daily-agent-picks", dailyAgentPicksRoutes);
router.use("/v2/integrations/tradingview", tradingViewIntegrationRoutes);
router.use("/chat", chatRoutes);

// Phase UI-INTEGRATION-001 — the first real HTTP surface for three
// backend-only engines built in prior phases (Claim Intelligence Layer,
// Options Agent, Market Sentiment Engine), each of which explicitly
// deferred routing to a later phase. Every handler is a thin pass-
// through to its already-real, already-tested canonical service — no
// new business logic is introduced here.
router.use("/v2/claims", claimsRoutes);
router.use("/v2/options-agent", optionsAgentRoutes);
router.use("/v2/market-sentiment", marketSentimentRoutes);

// Phase PRODUCT-001 — the canonical daily-decision surface: Morning
// Brief, backed entirely by the Attention Engine + existing Claim/
// Portfolio services above. No new business logic in the route itself.
router.use("/v2/morning-brief", morningBriefRoutes);

// Phase COMMERCIAL-MVP-001 — Commercial Infrastructure. Real
// registration/login/session management, vendor-agnostic billing, and
// account management (upgrade/cancel). `/v2/account` requires a real,
// verified session for every route (gated inside accountRoutes.js
// itself); `/v2/auth` and `/v2/billing` are intentionally open (a
// caller needs to register/login before it has a token, and a billing
// webhook comes from the vendor, not a logged-in user).
router.use("/v2/auth", authRoutes);
router.use("/v2/billing", billingRoutes);
router.use("/v2/account", accountRoutes);

module.exports = router;
