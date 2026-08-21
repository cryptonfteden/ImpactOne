// Phase INSIDER-AGENT-001 — resolves a stock symbol to its real SEC
// EDGAR CIK (Central Index Key), the identifier every other EDGAR
// lookup in this agent needs. Uses SEC's own real, public, no-auth
// `company_tickers.json` (https://www.sec.gov/files/company_tickers.json)
// — the same file EDGAR's own search UI is built on — never a
// hand-maintained or fabricated symbol->CIK mapping. Cached in-memory
// per process (this file rarely changes and is ~1000s of tickers) so
// repeated calls for different symbols in the same process don't each
// re-fetch it.
const { getSec } = require("../../secEdgarClient");
const { getPublicCompanyReference } = require("../../publicCompanyReference");

const COMPANY_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h — this file is updated by the SEC infrequently

let cache = null; // { builtAt, byTicker: Map<string, {cik, title}> }

function buildIndex(rawData) {
  const byTicker = new Map();
  for (const entry of Object.values(rawData)) {
    if (!entry || !entry.ticker || !Number.isFinite(Number(entry.cik_str))) continue;
    byTicker.set(entry.ticker.toUpperCase(), { cik: String(entry.cik_str).padStart(10, "0"), title: entry.title || null });
  }
  return byTicker;
}

function buildExchangeIndex(rawData) {
  const fields = Array.isArray(rawData?.fields) ? rawData.fields : [];
  const tickerIndex = fields.indexOf("ticker");
  const cikIndex = fields.indexOf("cik");
  const nameIndex = fields.indexOf("name");
  const byTicker = new Map();
  for (const row of rawData?.data || []) {
    const ticker = row?.[tickerIndex];
    const cik = Number(row?.[cikIndex]);
    if (!ticker || !Number.isFinite(cik)) continue;
    byTicker.set(String(ticker).toUpperCase(), { cik: String(cik).padStart(10, "0"), title: row?.[nameIndex] || null });
  }
  return byTicker;
}

function isCacheFresh(now) {
  return cache && now - cache.builtAt < CACHE_TTL_MS;
}

async function fetchTickerIndex({ timeoutMs = 10000, now = Date.now() } = {}) {
  if (isCacheFresh(now)) return cache.byTicker;

  let byTicker;
  try {
    const response = await getSec(COMPANY_TICKERS_URL, { timeout: timeoutMs });
    byTicker = buildIndex(response.data || {});
  } catch {
    const response = await getSec("https://www.sec.gov/files/company_tickers_exchange.json", { timeout: timeoutMs });
    byTicker = buildExchangeIndex(response.data || {});
  }
  cache = { builtAt: now, byTicker };
  return byTicker;
}

/**
 * @param {string} symbol
 * @returns {Promise<{ cik: string, title: string|null } | null>} `cik` is
 *   the real, 10-digit zero-padded CIK; `null` (never fabricated) if the
 *   real index has no entry for this symbol or the fetch itself fails.
 */
async function resolveCik(symbol) {
  const normalized = symbol.toUpperCase();
  const secLookup = fetchTickerIndex().then((index) => index.get(normalized) || null).catch(() => null);
  const massiveLookup = getPublicCompanyReference(normalized).then((reference) => {
    const cik = Number(reference?.cik);
    return Number.isFinite(cik) ? { cik: String(cik).padStart(10, "0"), title: reference?.name || null } : null;
  }).catch(() => null);
  try {
    return await Promise.any([secLookup, massiveLookup].map((lookup) => lookup.then((value) => value || Promise.reject(new Error("not-found")))));
  } catch { return null; }
}

function clearCache() {
  cache = null;
}

module.exports = { resolveCik, clearCache, buildIndex, buildExchangeIndex };
