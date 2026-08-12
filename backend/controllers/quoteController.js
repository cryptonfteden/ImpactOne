const { getQuote, getShortVolumeRange } = require("../services/finnhubService");

async function getQuoteController(req, res, next) {
  try {
    const symbol = req.query.symbol || "NVDA";
    const analysis = await getQuote(symbol);
    res.json({
      symbol,
      quote: analysis.quote,
      company: analysis.company,
      recommendation: analysis.recommendation,
      recommendationTrend: analysis.recommendationTrend,
      news: analysis.news,
      chart: analysis.chart,
      fearGreed: analysis.fearGreed,
      snapshotSignals: analysis.snapshotSignals,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ symbol: req.query.symbol || "NVDA", error: error.message });
    }
    next(error);
  }
}

async function getShortVolumeRangeController(req, res, next) {
  try {
    const symbol = req.query.symbol || "NVDA";
    const sessions = Number(req.query.sessions);
    const range = await getShortVolumeRange(symbol, sessions);
    res.json(range);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ symbol: req.query.symbol || "NVDA", error: error.message });
    }
    next(error);
  }
}

module.exports = { getQuoteController, getShortVolumeRangeController };
