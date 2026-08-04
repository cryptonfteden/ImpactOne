// Phase ETF-FLOW-AGENT-001 — resolves a real stock symbol to its real
// sector via Finnhub's `/stock/profile2` `finnhubIndustry` field — the
// exact same real, already-proven field `valuationDataProvider.js`
// already uses. Reused here (a real, live network call) rather than
// duplicated logic, so a stock symbol can be mapped to its real sector
// ETF (via sectorEtfMap.js) for this agent's sector-proxy analysis.
const axios = require("axios");
const { FINNHUB_API_KEY } = require("../../../config/env");

const DEFAULT_TIMEOUT_MS = 8000;

function isConfigured() {
  return Boolean(FINNHUB_API_KEY);
}

/**
 * @param {string} symbol
 * @returns {Promise<{ sector: string|null, dataAvailable: boolean, unavailableReason: string|null }>}
 */
async function resolveStockSector(symbol, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  if (!isConfigured()) {
    return { sector: null, dataAvailable: false, unavailableReason: "No Finnhub API key is configured — set FINNHUB_API_KEY." };
  }

  try {
    const response = await axios.get("https://finnhub.io/api/v1/stock/profile2", { params: { symbol, token: FINNHUB_API_KEY }, timeout: timeoutMs });
    const sector = response.data?.finnhubIndustry || null;
    if (!sector) {
      return { sector: null, dataAvailable: false, unavailableReason: `Finnhub returned no real sector/industry classification for "${symbol}".` };
    }
    return { sector, dataAvailable: true, unavailableReason: null };
  } catch (error) {
    return { sector: null, dataAvailable: false, unavailableReason: `Finnhub request failed: ${error.message}` };
  }
}

module.exports = { resolveStockSector, isConfigured };
