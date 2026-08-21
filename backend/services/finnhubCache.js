const cache = new Map();
const { FINNHUB_QUOTE_CACHE_TTL_MS = 5 * 60 * 1000 } = require("../config/env");

function getCacheKey(symbol) {
  return symbol.toUpperCase();
}

function getCachedQuote(symbol) {
  const key = getCacheKey(symbol);
  const item = cache.get(key);

  if (!item) return null;

  if (Date.now() - item.timestamp > FINNHUB_QUOTE_CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }

  return item.data;
}

function setCachedQuote(symbol, data) {
  cache.set(getCacheKey(symbol), {
    timestamp: Date.now(),
    data,
  });
}

module.exports = { getCachedQuote, setCachedQuote };
