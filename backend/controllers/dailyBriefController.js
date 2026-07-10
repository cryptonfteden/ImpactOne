const { getDailyBrief } = require("../services/dailyBriefService");

function parseCsv(value = "") {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function getAutonomousDailyBrief(req, res, next) {
  try {
    const watchlist = parseCsv(req.query.watchlist || req.body?.watchlist || "AAPL,NVDA,TSLA");
    const scenarios = parseCsv(req.query.scenarios || req.body?.scenarios || "Oil spike,Fed rate hike,BTC ETF approval,Israel conflict");
    const sessionType = String(req.query.sessionType || req.body?.sessionType || "morning");

    const brief = await getDailyBrief({
      watchlist,
      scenarios,
      sessionType,
    });

    res.json(brief);
  } catch (error) {
    next(error);
  }
}

module.exports = { getAutonomousDailyBrief };
