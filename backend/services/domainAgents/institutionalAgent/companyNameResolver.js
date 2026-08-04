// Phase INSTITUTIONAL-AGENT-001 — resolves a real stock symbol to its
// real company name via Finnhub's `/stock/profile2` `name` field (the
// same real, already-proven endpoint `valuationDataProvider.js`/
// `stockSectorResolver.js` already call) — needed because real SEC 13F
// Information Tables key holdings by free-text `nameOfIssuer`, not by
// ticker symbol.
const axios = require("axios");
const { FINNHUB_API_KEY } = require("../../../config/env");

const DEFAULT_TIMEOUT_MS = 8000;

function isConfigured() {
  return Boolean(FINNHUB_API_KEY);
}

/**
 * @param {string} symbol
 * @returns {Promise<{ companyName: string|null, dataAvailable: boolean, unavailableReason: string|null }>}
 */
async function resolveCompanyName(symbol, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  if (!isConfigured()) {
    return { companyName: null, dataAvailable: false, unavailableReason: "No Finnhub API key is configured — set FINNHUB_API_KEY." };
  }

  try {
    const response = await axios.get("https://finnhub.io/api/v1/stock/profile2", { params: { symbol, token: FINNHUB_API_KEY }, timeout: timeoutMs });
    const companyName = response.data?.name || null;
    if (!companyName) {
      return { companyName: null, dataAvailable: false, unavailableReason: `Finnhub returned no real company name for "${symbol}".` };
    }
    return { companyName, dataAvailable: true, unavailableReason: null };
  } catch (error) {
    return { companyName: null, dataAvailable: false, unavailableReason: `Finnhub request failed: ${error.message}` };
  }
}

module.exports = { resolveCompanyName, isConfigured };
