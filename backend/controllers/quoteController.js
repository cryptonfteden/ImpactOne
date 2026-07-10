const { getQuote } = require("../services/finnhubService");

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
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ symbol: req.query.symbol || "NVDA", error: error.message });
    }
    next(error);
  }
}

module.exports = { getQuoteController };
