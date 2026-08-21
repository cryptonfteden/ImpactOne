// Phase INSTITUTIONAL-AGENT-001 — resolves a real stock symbol to its
// real company name via Finnhub's `/stock/profile2` `name` field (the
// same real, already-proven endpoint `valuationDataProvider.js`/
// `stockSectorResolver.js` already call) — needed because real SEC 13F
// Information Tables key holdings by free-text `nameOfIssuer`, not by
// ticker symbol.
const axios = require("axios");
const { FINNHUB_API_KEY, SEC_EDGAR_USER_AGENT, POLYGON_API_KEY } = require("../../../config/env");
const { getPublicCompanyReference } = require("../../publicCompanyReference");
const { getSec } = require("../../secEdgarClient");

const DEFAULT_TIMEOUT_MS = 8000;

function isConfigured() {
  return Boolean(FINNHUB_API_KEY || SEC_EDGAR_USER_AGENT);
}

let secTickerCache = null;

async function resolveFromSec(symbol, timeoutMs) {
  if (!SEC_EDGAR_USER_AGENT) return null;
  if (!secTickerCache) {
    const response = await getSec("https://www.sec.gov/files/company_tickers.json", { timeout: timeoutMs });
    secTickerCache = new Map(Object.values(response.data || {}).map((row) => [String(row.ticker || "").toUpperCase(), row.title || null]));
  }
  return secTickerCache.get(String(symbol).toUpperCase()) || null;
}

/**
 * @param {string} symbol
 * @returns {Promise<{ companyName: string|null, dataAvailable: boolean, unavailableReason: string|null }>}
 */
async function resolveCompanyName(symbol, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const lookups = [
    FINNHUB_API_KEY ? axios.get("https://finnhub.io/api/v1/stock/profile2", { params: { symbol, token: FINNHUB_API_KEY }, timeout: timeoutMs }).then((r) => r.data?.name ? { name:r.data.name, source:"Finnhub" } : null).catch(() => null) : null,
    SEC_EDGAR_USER_AGENT ? resolveFromSec(symbol, timeoutMs).then((name) => name ? { name, source:"SEC company tickers" } : null).catch(() => null) : null,
    POLYGON_API_KEY ? getPublicCompanyReference(symbol, { timeoutMs }).then((r) => r?.name ? { name:r.name, source:"Massive reference" } : null).catch(() => null) : null,
  ].filter(Boolean);
  let match = null;
  try { match = await Promise.any(lookups.map((lookup) => lookup.then((value) => value || Promise.reject(new Error("not-found"))))); } catch {}
  return match ? { companyName:match.name, dataAvailable:true, unavailableReason:null, source:match.source } : { companyName:null, dataAvailable:false, unavailableReason:"Finnhub, SEC and Massive returned no verified company name." };
}

module.exports = { resolveCompanyName, isConfigured };
