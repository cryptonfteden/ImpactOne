// Sprint 37 — real OHLCV history for technicalIntelligenceService. Uses the
// same no-auth-required Yahoo Finance chart endpoint
// finnhubService.getHistoricalSeries already calls for the Home portfolio
// sparkline — but that function only extracts closes. This extracts full
// open/high/low/close/volume bars, needed for ATR/VWAP/support-resistance,
// without touching finnhubService.js or any of its existing callers.
//
// Phase REDIS-CACHE-001 — wrapped in the real, shared provider cache
// (services/redisCache/). This is a deterministic, read-only response
// (a given symbol+range's daily bars don't change once a trading day
// settles) — exactly the kind of provider call the mission names as
// cacheable. `getDailyBars`'s own signature, return shape, and error
// handling are completely unchanged ("no change to business logic"):
// every existing caller gets back the exact same real array it always
// did, just served from a real cache entry on a hit, or a real,
// uncached network call — identical to before this phase — on a miss
// or whenever Redis is unavailable (the cache module's own graceful
// fallback, see redisClient.js/providerCache.js).
const axios = require("axios");
const { sharedProviderCache } = require("../redisCache/providerCache");
const { getTtlMsForNamespace } = require("../redisCache/providerCacheConfig");

const CACHE_NAMESPACE = "priceHistory";

async function fetchDailyBarsFresh(normalizedSymbol, range) {
  try {
    const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${normalizedSymbol}`, {
      params: { interval: "1d", range, includeAdjustedClose: "true" },
      timeout: 10000,
    });

    const result = response.data?.chart?.result?.[0];
    const timestamps = result?.timestamp || [];
    const quote = result?.indicators?.quote?.[0] || {};

    return timestamps
      .map((timestamp, index) => ({
        date: new Date(timestamp * 1000).toISOString().slice(0, 10),
        open: quote.open?.[index],
        high: quote.high?.[index],
        low: quote.low?.[index],
        close: quote.close?.[index],
        volume: quote.volume?.[index],
      }))
      .filter((bar) => [bar.open, bar.high, bar.low, bar.close].every((value) => Number.isFinite(value)));
  } catch (error) {
    return [];
  }
}

async function getDailyBars(symbol, { range = "1y" } = {}) {
  const normalizedSymbol = String(symbol || "").trim().toUpperCase();
  if (!normalizedSymbol) return [];

  const cacheKey = `${CACHE_NAMESPACE}:${normalizedSymbol}:${range}`;
  const ttlMs = getTtlMsForNamespace(CACHE_NAMESPACE);

  return sharedProviderCache.getOrCompute(cacheKey, () => fetchDailyBarsFresh(normalizedSymbol, range), { ttlMs });
}

module.exports = { getDailyBars };
