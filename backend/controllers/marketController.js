const { getQuote } = require("../services/finnhubService");
const { getPreviousClose } = require("../services/polygonService");
const { getMarketOverview } = require("../services/alphaVantageService");

async function getMarket(req, res, next) {
  try {
    const symbol = req.query.symbol || "NVDA";
    const [quote, previousClose, marketOverview] = await Promise.all([
      getQuote(symbol),
      getPreviousClose(symbol),
      getMarketOverview("TIME_SERIES_DAILY", symbol),
    ]);

    res.json({ symbol, quote, previousClose, marketOverview });
  } catch (error) {
    next(error);
  }
}

module.exports = { getMarket };
