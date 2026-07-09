const cache = new Map();

function getCacheKey(symbol) {
  return symbol.toUpperCase();
}

function getCachedQuote(symbol) {
  const key = getCacheKey(symbol);
  const item = cache.get(key);

  if (!item) return null;

  if (Date.now() - item.timestamp > 60000) {
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
