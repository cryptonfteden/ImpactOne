const { getQuote } = require("../services/finnhubService");
const { analyzeTicker } = require("../services/openaiService");

function toAlertBadge(quote, aiRating) {
  const change = Number(quote?.change || 0);
  const normalized = String(aiRating || "Hold").toLowerCase();

  if (change <= -3 || normalized === "sell") {
    return { type: "risk", label: "Risk" };
  }
  if (change >= 3 || normalized === "strong buy") {
    return { type: "opportunity", label: "Opportunity" };
  }
  return { type: "monitor", label: "Monitor" };
}

async function getWatchlist(req, res, next) {
  try {
    const symbols = (req.query.symbols || "NVDA,PLTR,AMZN,TSLA").split(",").map((item) => item.trim());
    const rows = [];

    for (const symbol of symbols) {
      const payload = await getQuote(symbol);
      const analysis = await analyzeTicker(symbol, {
        quote: payload.quote,
        company: payload.company,
        recommendation: payload.recommendation,
        recommendationTrend: payload.recommendationTrend,
        news: (payload.news || []).slice(0, 3),
        metrics: {
          marketCap: payload.quote?.marketCap,
          pe: payload.quote?.pe,
          change: payload.quote?.change,
        },
      });

      const aiRating = analysis?.investmentRating || analysis?.recommendation || "Hold";
      rows.push({
        symbol: payload.quote?.symbol || symbol,
        company: payload.company?.name || symbol,
        price: Number(payload.quote?.price || 0),
        change: Number(payload.quote?.change || 0),
        aiRating,
        aiScore: Number(analysis?.confidenceScore || 0),
        alertBadge: toAlertBadge(payload.quote, aiRating),
      });
    }

    res.json({ watchlist: rows });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message, watchlist: [] });
    }
    next(error);
  }
}

module.exports = { getWatchlist };
