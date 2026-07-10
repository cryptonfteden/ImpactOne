const { getTickerComparison } = require("../services/comparisonService");

async function getComparison(req, res, next) {
  try {
    const symbol = (req.query.symbol || "NVDA").toUpperCase();
    const payload = await getTickerComparison(symbol);
    res.json(payload);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        symbol: req.query.symbol || "NVDA",
        error: error.message,
      });
    }
    next(error);
  }
}

module.exports = { getComparison };