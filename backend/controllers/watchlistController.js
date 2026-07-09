const { getQuote } = require("../services/finnhubService");

async function getWatchlist(req, res, next) {
  try {
    const symbols = (req.query.symbols || "NVDA,PLTR,AMZN,TSLA").split(",").map((item) => item.trim());
    const results = await Promise.all(symbols.map((symbol) => getQuote(symbol)));
    res.json({ watchlist: results });
  } catch (error) {
    next(error);
  }
}

module.exports = { getWatchlist };
