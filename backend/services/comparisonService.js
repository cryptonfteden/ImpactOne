const { getQuote, getPeerSymbols } = require("./finnhubService");
const { analyzeTicker } = require("./openaiService");

function buildAiContext(payload) {
  return {
    quote: payload.quote,
    company: payload.company,
    recommendation: payload.recommendation,
    recommendationTrend: payload.recommendationTrend,
    news: (payload.news || []).slice(0, 3),
    metrics: {
      marketCap: payload.quote?.marketCap || "--",
      pe: payload.quote?.pe || "--",
      change: payload.quote?.change || 0,
    },
  };
}

function toComparisonRow(symbol, payload, analysis) {
  return {
    symbol,
    priceChange: Number(payload.quote?.change || 0),
    marketCap: payload.quote?.marketCap || "--",
    pe: payload.quote?.pe || "--",
    analystRating: payload.recommendation?.label || "Hold",
    aiRating: analysis?.investmentRating || "Hold",
    aiScore: Number(analysis?.confidenceScore || 0),
  };
}

async function getTickerComparison(symbol) {
  const normalized = (symbol || "NVDA").toUpperCase();
  const peers = await getPeerSymbols(normalized, 2);
  const symbols = [normalized, ...peers];

  const rows = [];

  for (const current of symbols) {
    const quotePayload = await getQuote(current);
    const analysis = await analyzeTicker(current, buildAiContext(quotePayload));
    rows.push(toComparisonRow(current, quotePayload, analysis));
  }

  return {
    symbol: normalized,
    peers,
    comparison: rows,
  };
}

module.exports = { getTickerComparison };