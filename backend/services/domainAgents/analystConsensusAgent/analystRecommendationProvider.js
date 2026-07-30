// Phase ANALYST-CONSENSUS-AGENT-001 — the real provider abstraction.
// Fetches Finnhub's real, free-tier `/stock/recommendation` endpoint
// (already proven live elsewhere in this codebase — see
// finnhubService.js's own `getQuote()`), returning the real monthly
// analyst-rating-trend series (strongBuy/buy/hold/sell/strongSell per
// real reporting period), sorted oldest-first.
//
// Honesty note: confirmed live during development that Finnhub's free
// tier returns a real 403 for `/stock/price-target`, `/stock/eps-
// estimate`, `/stock/revenue-estimate`, and `/stock/upgrade-downgrade`
// — all four require a paid Finnhub plan. Only `/stock/recommendation`
// is real and free. This provider therefore only ever returns real
// rating-trend data; every downstream analyzer that needs price
// targets or estimate revisions honestly reports unavailable rather
// than fabricating a value or silently substituting the rating trend.
const axios = require("axios");
const { FINNHUB_API_KEY } = require("../../../config/env");

const REQUEST_TIMEOUT_MS = 10000;

function emptyMetrics(symbol, reason) {
  return { symbol, dataAvailable: false, unavailableReason: reason, periods: [] };
}

/**
 * @param {string} symbol
 * @returns {Promise<{ symbol: string, dataAvailable: boolean, unavailableReason: string|null, periods: Array<{period:string, strongBuy:number, buy:number, hold:number, sell:number, strongSell:number}> }>}
 */
async function getSymbolAnalystRecommendations(symbol) {
  const normalizedSymbol = (symbol || "").toUpperCase();
  if (!normalizedSymbol) {
    return emptyMetrics(symbol, "No symbol provided.");
  }
  if (!FINNHUB_API_KEY) {
    return emptyMetrics(normalizedSymbol, "FINNHUB_API_KEY is not configured — no real analyst recommendation provider is available.");
  }

  try {
    const response = await axios.get("https://finnhub.io/api/v1/stock/recommendation", {
      params: { symbol: normalizedSymbol, token: FINNHUB_API_KEY },
      timeout: REQUEST_TIMEOUT_MS,
    });

    const raw = Array.isArray(response.data) ? response.data : [];
    if (!raw.length) {
      return emptyMetrics(normalizedSymbol, `Finnhub returned no real analyst recommendation data for "${normalizedSymbol}".`);
    }

    const periods = [...raw]
      .map((entry) => ({
        period: entry.period,
        strongBuy: Number(entry.strongBuy) || 0,
        buy: Number(entry.buy) || 0,
        hold: Number(entry.hold) || 0,
        sell: Number(entry.sell) || 0,
        strongSell: Number(entry.strongSell) || 0,
      }))
      .sort((a, b) => new Date(a.period) - new Date(b.period));

    return { symbol: normalizedSymbol, dataAvailable: true, unavailableReason: null, periods };
  } catch (error) {
    const status = error.response?.status;
    const reason =
      status === 401 || status === 403
        ? `Finnhub rejected the analyst recommendation request for "${normalizedSymbol}" (status ${status}) — API key invalid, or this endpoint requires a higher plan.`
        : `Finnhub analyst recommendation request failed for "${normalizedSymbol}": ${error.message}`;
    return emptyMetrics(normalizedSymbol, reason);
  }
}

module.exports = { getSymbolAnalystRecommendations, emptyMetrics };
