// Phase NEWS-AGENT-001 — a real, dedicated fetch of Finnhub's real
// `/stock/profile2` endpoint (the exact same real, free, already-
// configured endpoint and calling convention already proven live in
// finnhubService.js's own getQuote()), used here only for its real
// `finnhubIndustry` field — the closest real signal this codebase has
// for "Affected Sectors" / classifying "Sector news". Honestly reports
// unavailable on any real failure — never a fabricated sector.
const axios = require("axios");
const { FINNHUB_API_KEY } = require("../../../config/env");

const REQUEST_TIMEOUT_MS = 10000;

function emptyProfile(symbol, reason) {
  return { symbol, dataAvailable: false, unavailableReason: reason, companyName: null, industry: null };
}

/**
 * @param {string} symbol
 * @returns {Promise<{ symbol: string, dataAvailable: boolean, unavailableReason: string|null, companyName: string|null, industry: string|null }>}
 */
async function getCompanyProfile(symbol) {
  const normalizedSymbol = (symbol || "").toUpperCase();
  if (!normalizedSymbol) {
    return emptyProfile(symbol, "No symbol provided.");
  }
  if (!FINNHUB_API_KEY) {
    return emptyProfile(normalizedSymbol, "FINNHUB_API_KEY is not configured — no real company-profile provider is available.");
  }

  try {
    const response = await axios.get("https://finnhub.io/api/v1/stock/profile2", {
      params: { symbol: normalizedSymbol, token: FINNHUB_API_KEY },
      timeout: REQUEST_TIMEOUT_MS,
    });

    const data = response.data;
    if (!data || !data.name) {
      return emptyProfile(normalizedSymbol, `Finnhub returned no real company profile for "${normalizedSymbol}".`);
    }

    return { symbol: normalizedSymbol, dataAvailable: true, unavailableReason: null, companyName: data.name, industry: data.finnhubIndustry || null };
  } catch (error) {
    const status = error.response?.status;
    const reason =
      status === 401 || status === 403
        ? `Finnhub rejected the company-profile request for "${normalizedSymbol}" (status ${status}).`
        : `Finnhub company-profile request failed for "${normalizedSymbol}": ${error.message}`;
    return emptyProfile(normalizedSymbol, reason);
  }
}

module.exports = { getCompanyProfile, emptyProfile };
