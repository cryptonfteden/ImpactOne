// Real OHLCV history for technicalIntelligenceService. It uses Massive
// (formerly Polygon.io) with POLYGON_API_KEY and returns only verified market
// bars. Open/high/low/close/volume feed ATR, VWAP and support/resistance.
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
const { POLYGON_API_KEY, FINNHUB_API_KEY } = require("../../config/env");
const { sharedProviderCache } = require("../redisCache/providerCache");
const { getTtlMsForNamespace } = require("../redisCache/providerCacheConfig");

const CACHE_NAMESPACE = "priceHistory";

function rangeToStartDate(range) {
  // Current chart provider returns verified daily bars. Intraday selectors
  // therefore use the smallest honest daily lookback until an intraday feed
  // is connected, rather than fabricating 15-minute/4-hour candles.
  const daysByRange = { "15m": 2, "4h": 5, "1d": 10, "1w": 14, "5d": 10, "1mo": 35, "3mo": 100, "6mo": 190, "1y": 370, "2y": 730, "5y": 1900 };
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - (daysByRange[range] || daysByRange["1y"]));
  return start.toISOString().slice(0, 10);
}

function normalizeMassiveBars(results) {
  return (results || [])
    .map((bar) => ({
      date: new Date(bar.t).toISOString().slice(0, 10),
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v,
    }))
    .filter((bar) => [bar.open, bar.high, bar.low, bar.close].every((value) => Number.isFinite(value)));
}

async function fetchFinnhubDailyBars(normalizedSymbol, range) {
  if (!FINNHUB_API_KEY) return [];
  try {
    const now = Math.floor(Date.now() / 1000);
    const from = Math.floor(new Date(`${rangeToStartDate(range)}T00:00:00Z`).getTime() / 1000);
    const response = await axios.get("https://finnhub.io/api/v1/stock/candle", {
      params: { symbol: normalizedSymbol, resolution: "D", from, to: now, token: FINNHUB_API_KEY },
      timeout: 10000,
    });
    const payload = response.data || {};
    if (payload.s !== "ok" || !Array.isArray(payload.t)) return [];
    return payload.t.map((timestamp, index) => ({
      date: new Date(Number(timestamp) * 1000).toISOString().slice(0, 10),
      open: Number(payload.o?.[index]),
      high: Number(payload.h?.[index]),
      low: Number(payload.l?.[index]),
      close: Number(payload.c?.[index]),
      volume: Number(payload.v?.[index]) || 0,
    })).filter((bar) => [bar.open, bar.high, bar.low, bar.close].every(Number.isFinite));
  } catch {
    return [];
  }
}

function rangeToYahooRange(range) {
  return {
    "15m": "5d",
    "4h": "5d",
    "1d": "5d",
    "1w": "1mo",
    "1mo": "1mo",
    "3mo": "3mo",
    "1y": "1y",
  }[range] || "1y";
}

// Public end-of-day fallback. This is only used when the configured paid
// providers are rate-limited or rejected; it returns the source's actual
// OHLCV rows and never synthesizes a candle. Keeping it last preserves the
// configured provider as the primary source whenever it is available.
async function fetchYahooDailyBars(normalizedSymbol, range) {
  try {
    const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(normalizedSymbol)}`, {
      params: { range: rangeToYahooRange(range), interval: "1d", events: "history" },
      timeout: 15000,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ImpactOne/1.0)" },
    });
    const result = response.data?.chart?.result?.[0];
    const quote = result?.indicators?.quote?.[0] || {};
    if (!Array.isArray(result?.timestamp)) return [];
    return result.timestamp.map((timestamp, index) => {
      const open = quote.open?.[index];
      const high = quote.high?.[index];
      const low = quote.low?.[index];
      const close = quote.close?.[index];
      const volume = quote.volume?.[index];
      return {
        date: new Date(Number(timestamp) * 1000).toISOString().slice(0, 10),
        open: Number(open), high: Number(high), low: Number(low), close: Number(close), volume: Number(volume) || 0,
        hasVerifiedOhlc: [open, high, low, close].every((value) => value !== null && value !== undefined && Number.isFinite(Number(value))),
      };
    }).filter((bar) => bar.hasVerifiedOhlc).map(({ hasVerifiedOhlc, ...bar }) => bar);
  } catch {
    return [];
  }
}

async function fetchDailyBarsFresh(normalizedSymbol, range) {
  try {
    if (POLYGON_API_KEY) {
      const response = await axios.get(`https://api.massive.com/v2/aggs/ticker/${encodeURIComponent(normalizedSymbol)}/range/1/day/${rangeToStartDate(range)}/${new Date().toISOString().slice(0, 10)}`, {
        params: { adjusted: "true", sort: "asc", limit: 5000, apiKey: POLYGON_API_KEY },
        timeout: 10000,
      });
      const massiveBars = normalizeMassiveBars(response.data?.results);
      if (massiveBars.length) return massiveBars;
    }
  } catch {
    // Fall through to the configured secondary live provider.
  }

  const finnhubBars = await fetchFinnhubDailyBars(normalizedSymbol, range);
  if (finnhubBars.length) return finnhubBars;
  return fetchYahooDailyBars(normalizedSymbol, range);
}

async function getDailyBars(symbol, { range = "1y" } = {}) {
  const normalizedSymbol = String(symbol || "").trim().toUpperCase();
  if (!normalizedSymbol) return [];

  // v2 deliberately isolates this from prior cached empty responses. A
  // provider timeout must never make a later healthy chart look data-less.
  const cacheKey = `${CACHE_NAMESPACE}:v2:${normalizedSymbol}:${range}`;
  const ttlMs = getTtlMsForNamespace(CACHE_NAMESPACE);

  return sharedProviderCache.getOrCompute(
    cacheKey,
    () => fetchDailyBarsFresh(normalizedSymbol, range),
    { ttlMs, shouldCache: (bars) => Array.isArray(bars) && bars.length > 0 }
  );
}

module.exports = { getDailyBars, rangeToStartDate, rangeToYahooRange, fetchYahooDailyBars };
