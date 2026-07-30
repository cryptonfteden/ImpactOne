// Phase ANALYST-CONSENSUS-AGENT-001 — a real, dedicated attempt at
// Finnhub's `/stock/price-target` endpoint. Confirmed live during
// development that this endpoint returns a real HTTP 403 on the free
// tier configured in this environment ("You don't have access to this
// resource.") — a genuine paid-plan restriction, not a transient
// failure. This provider still makes the real call (so a future paid
// API key would transparently start working with zero code changes),
// but on any failure — 403 or otherwise — it honestly reports
// unavailable, mirroring the short-interest agent's own
// `borrowStressAnalyzer.js` precedent for a permanently-out-of-reach
// real metric. Never fabricates a target price.
const axios = require("axios");
const { FINNHUB_API_KEY } = require("../../../config/env");

const REQUEST_TIMEOUT_MS = 10000;

function emptyMetrics(symbol, reason) {
  return { symbol, dataAvailable: false, unavailableReason: reason, targetHigh: null, targetLow: null, targetMedian: null, targetMean: null, lastUpdated: null };
}

/**
 * @param {string} symbol
 * @returns {Promise<{ symbol: string, dataAvailable: boolean, unavailableReason: string|null, targetHigh: number|null, targetLow: number|null, targetMedian: number|null, targetMean: number|null, lastUpdated: string|null }>}
 */
async function getSymbolPriceTargets(symbol) {
  const normalizedSymbol = (symbol || "").toUpperCase();
  if (!normalizedSymbol) {
    return emptyMetrics(symbol, "No symbol provided.");
  }
  if (!FINNHUB_API_KEY) {
    return emptyMetrics(normalizedSymbol, "FINNHUB_API_KEY is not configured — no real price-target provider is available.");
  }

  try {
    const response = await axios.get("https://finnhub.io/api/v1/stock/price-target", {
      params: { symbol: normalizedSymbol, token: FINNHUB_API_KEY },
      timeout: REQUEST_TIMEOUT_MS,
    });

    const data = response.data;
    if (!data || !Number.isFinite(data.targetMean)) {
      return emptyMetrics(normalizedSymbol, `Finnhub returned no real price-target data for "${normalizedSymbol}".`);
    }

    return {
      symbol: normalizedSymbol,
      dataAvailable: true,
      unavailableReason: null,
      targetHigh: data.targetHigh ?? null,
      targetLow: data.targetLow ?? null,
      targetMedian: data.targetMedian ?? null,
      targetMean: data.targetMean,
      lastUpdated: data.lastUpdated ?? null,
    };
  } catch (error) {
    const status = error.response?.status;
    const reason =
      status === 403
        ? `Finnhub's /stock/price-target endpoint requires a paid plan (received a real HTTP 403 for "${normalizedSymbol}") — no free real price-target source is configured in this environment.`
        : status === 401
        ? `Finnhub rejected the price-target request for "${normalizedSymbol}" (status ${status}) — API key invalid.`
        : `Finnhub price-target request failed for "${normalizedSymbol}": ${error.message}`;
    return emptyMetrics(normalizedSymbol, reason);
  }
}

module.exports = { getSymbolPriceTargets, emptyMetrics };
