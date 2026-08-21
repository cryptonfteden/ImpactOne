const axios = require("axios");
const { POLYGON_API_KEY } = require("../config/env");

const cache = new Map();
const TTL_MS = 24 * 60 * 60 * 1000;

async function getPublicCompanyReference(symbol, { timeoutMs = 8000 } = {}) {
  if (!POLYGON_API_KEY) return null;
  const normalized = String(symbol || "").toUpperCase();
  const existing = cache.get(normalized);
  if (existing && Date.now() - existing.at < TTL_MS) return existing.value;
  if (existing?.promise) return existing.promise;
  const promise = axios.get(`https://api.massive.com/v3/reference/tickers/${encodeURIComponent(normalized)}`, {
    params: { apiKey: POLYGON_API_KEY }, timeout: timeoutMs,
  }).then((response) => {
    const raw = response.data?.results || null;
    cache.set(normalized, { at: Date.now(), value: raw });
    return raw;
  }).catch(() => null);
  cache.set(normalized, { at: 0, promise });
  return promise;
}

function clearCache() { cache.clear(); }
module.exports = { getPublicCompanyReference, clearCache };
