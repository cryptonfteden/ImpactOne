const { getAutonomousOverview } = require("../services/autonomousMarketService");
// Namespace-style (not destructured) so tests can monkey-patch these,
// matching this codebase's established test-seam convention.
const investorProfileService = require("../services/investorProfileService");
const feedPersonalizationService = require("../services/feedPersonalizationService");

function parseCsv(value = "") {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function getAutonomousOverviewController(req, res, next) {
  try {
    const watchlist = parseCsv(req.query.watchlist || req.body?.watchlist || "AAPL,NVDA,TSLA");
    const scenarios = parseCsv(req.query.scenarios || req.body?.scenarios || "Oil spike,Fed rate hike,BTC ETF approval,Israel conflict");
    const sessionType = String(req.query.sessionType || req.body?.sessionType || "morning");
    const overview = await getAutonomousOverview({ watchlist, scenarios, sessionType });
    res.json(overview);
  } catch (error) {
    next(error);
  }
}

// Sprint 20, Part 5 — personalizes ordering only, never the feed's facts.
// Reads the InvestorProfile singleton server-side (consistent with the
// rest of this app's single-tenant pattern) rather than requiring the
// client to pass profile data over the wire. Backward compatible: with no
// profile yet (pre-onboarding), behavior is byte-for-byte unchanged.
async function getLiveFeed(req, res, next) {
  try {
    const watchlist = parseCsv(req.query.watchlist || "AAPL,NVDA,TSLA");
    const overview = await getAutonomousOverview({ watchlist });
    const investorProfile = await investorProfileService.getInvestorProfile().catch(() => null);
    const feed = investorProfile ? feedPersonalizationService.rankFeedForInvestor(overview.feed, { investorProfile }) : overview.feed;
    res.json({ generatedAt: overview.generatedAt, feed, alerts: overview.alerts });
  } catch (error) {
    next(error);
  }
}

async function getChangeWindows(req, res, next) {
  try {
    const watchlist = parseCsv(req.query.watchlist || "AAPL,NVDA,TSLA");
    const overview = await getAutonomousOverview({ watchlist });
    res.json({ generatedAt: overview.generatedAt, changeWindows: overview.changeWindows });
  } catch (error) {
    next(error);
  }
}

async function getWatchlistPriority(req, res, next) {
  try {
    const watchlist = parseCsv(req.query.watchlist || "AAPL,NVDA,TSLA");
    const overview = await getAutonomousOverview({ watchlist });
    res.json({ generatedAt: overview.generatedAt, watchlistRankings: overview.watchlistRankings });
  } catch (error) {
    next(error);
  }
}

async function getGlobalMap(req, res, next) {
  try {
    const watchlist = parseCsv(req.query.watchlist || "AAPL,NVDA,TSLA");
    const overview = await getAutonomousOverview({ watchlist });
    res.json({ generatedAt: overview.generatedAt, globalMap: overview.globalMap });
  } catch (error) {
    next(error);
  }
}

async function getDecisionCenter(req, res, next) {
  try {
    const watchlist = parseCsv(req.query.watchlist || "AAPL,NVDA,TSLA");
    const overview = await getAutonomousOverview({ watchlist });
    res.json({ generatedAt: overview.generatedAt, decisionCenter: overview.decisionCenter });
  } catch (error) {
    next(error);
  }
}

async function getAlphaDiscovery(req, res, next) {
  try {
    const watchlist = parseCsv(req.query.watchlist || "AAPL,NVDA,TSLA");
    const overview = await getAutonomousOverview({ watchlist });
    res.json({
      generatedAt: overview.generatedAt,
      alphaDiscovery: overview.alphaDiscovery,
      homepageAnswers: overview.homepageAnswers,
      scanCoverage: overview.scanCoverage,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAutonomousOverviewController,
  getLiveFeed,
  getChangeWindows,
  getWatchlistPriority,
  getGlobalMap,
  getDecisionCenter,
  getAlphaDiscovery,
};
