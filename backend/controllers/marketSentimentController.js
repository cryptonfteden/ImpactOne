// Phase UI-INTEGRATION-001 — the first real HTTP surface for the Market
// Sentiment Engine (built backend-only in Phase AI-ENGINE-002.1). Thin
// pass-through only.
const marketSentimentService = require("../services/marketSentiment/marketSentimentService");

function handleKnownError(error, res, next) {
  if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
  return next(error);
}

async function getOverview(req, res, next) {
  try {
    const market = req.query.market || "US";
    const reading = await marketSentimentService.getMarketSentiment(market);
    res.json(reading);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

module.exports = { getOverview };
