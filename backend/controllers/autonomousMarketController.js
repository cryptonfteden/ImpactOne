const { getAutonomousOverview } = require("../services/autonomousMarketService");

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

async function getLiveFeed(req, res, next) {
  try {
    const watchlist = parseCsv(req.query.watchlist || "AAPL,NVDA,TSLA");
    const overview = await getAutonomousOverview({ watchlist });
    res.json({ generatedAt: overview.generatedAt, feed: overview.feed, alerts: overview.alerts });
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
