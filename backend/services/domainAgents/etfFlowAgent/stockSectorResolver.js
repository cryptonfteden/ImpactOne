// Phase ETF-FLOW-AGENT-001 — resolves a real stock symbol to its real
// sector via Finnhub's `/stock/profile2` `finnhubIndustry` field — the
// exact same real, already-proven field `valuationDataProvider.js`
// already uses. Reused here (a real, live network call) rather than
// duplicated logic, so a stock symbol can be mapped to its real sector
// ETF (via sectorEtfMap.js) for this agent's sector-proxy analysis.
const axios = require("axios");
const { FINNHUB_API_KEY, SEC_EDGAR_USER_AGENT, POLYGON_API_KEY } = require("../../../config/env");
const { getPublicCompanyReference } = require("../../publicCompanyReference");
const { getSec } = require("../../secEdgarClient");

const DEFAULT_TIMEOUT_MS = 8000;

function isConfigured() {
  return Boolean(FINNHUB_API_KEY || SEC_EDGAR_USER_AGENT);
}

const SIC_SECTORS = [
  [[100, 999], "Energy"], [[1000, 1499], "Materials"], [[2000, 3999], "Industrials"],
  [[4000, 4999], "Communication Services"], [[5000, 5999], "Consumer Discretionary"],
  [[6000, 6799], "Financials"], [[7000, 7379], "Technology"],
  [[7380, 7399], "Industrials"], [[8000, 8099], "Health Care"], [[9000, 9999], "Industrials"],
];
let secTickerCache = null;

function sectorFromSic(sic) {
  const value = Number(sic);
  return SIC_SECTORS.find(([[low, high]]) => value >= low && value <= high)?.[1] || null;
}

async function resolveFromSec(symbol, timeoutMs) {
  if (!SEC_EDGAR_USER_AGENT) return null;
  if (!secTickerCache) {
    const response = await getSec("https://www.sec.gov/files/company_tickers.json", { timeout: timeoutMs });
    secTickerCache = new Map(Object.values(response.data || {}).map((row) => [String(row.ticker || "").toUpperCase(), String(row.cik_str || "").padStart(10, "0")]));
  }
  const cik = secTickerCache.get(String(symbol).toUpperCase());
  if (!cik) return null;
  const response = await getSec(`https://data.sec.gov/submissions/CIK${cik}.json`, { timeout: timeoutMs });
  return sectorFromSic(response.data?.sic);
}

/**
 * @param {string} symbol
 * @returns {Promise<{ sector: string|null, dataAvailable: boolean, unavailableReason: string|null }>}
 */
async function resolveStockSector(symbol, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const lookups = [
    FINNHUB_API_KEY ? axios.get("https://finnhub.io/api/v1/stock/profile2", { params:{ symbol, token:FINNHUB_API_KEY }, timeout:timeoutMs }).then((r) => r.data?.finnhubIndustry ? { sector:r.data.finnhubIndustry, source:"Finnhub" } : null).catch(() => null) : null,
    SEC_EDGAR_USER_AGENT ? resolveFromSec(symbol, timeoutMs).then((sector) => sector ? { sector, source:"SEC SIC classification" } : null).catch(() => null) : null,
    POLYGON_API_KEY ? getPublicCompanyReference(symbol, { timeoutMs }).then((r) => {
      const raw = r?.sic_description || "";
      const sector = /SEMICONDUCTOR|COMPUTER|SOFTWARE|ELECTRONIC/i.test(raw) ? "Technology" : sectorFromSic(r?.sic_code);
      return sector ? { sector, source:"Massive SEC reference" } : null;
    }).catch(() => null) : null,
  ].filter(Boolean);
  let match = null;
  try { match = await Promise.any(lookups.map((lookup) => lookup.then((value) => value || Promise.reject(new Error("not-found"))))); } catch {}
  return match ? { sector:match.sector, dataAvailable:true, unavailableReason:null, source:match.source } : { sector:null, dataAvailable:false, unavailableReason:"Finnhub, SEC and Massive returned no verified sector classification." };
}

module.exports = { resolveStockSector, isConfigured, sectorFromSic };
