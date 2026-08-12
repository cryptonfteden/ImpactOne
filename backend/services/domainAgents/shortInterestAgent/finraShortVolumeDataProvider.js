// Phase SHORT-INTEREST-AGENT-001 — the provider abstraction the
// mission requires. Fetches FINRA's real, free, no-auth daily Reg SHO
// short-volume files for a real recent window of weekdays, parsing out
// the target symbol's real row from each. Weekends are never
// requested (FINRA doesn't publish on non-trading days); a market
// holiday or a real, isolated fetch failure for one day honestly
// yields fewer real data points, never a fabricated stand-in for that
// day. Every module downstream is built on real daily short-volume
// data, never the official bi-monthly short-interest figure (see this
// file's own module for why that's out of scope this phase).
const axios = require("axios");
const { parseShortVolumeRow } = require("./shortVolumeFileParser");

const DEFAULT_LOOKBACK_TRADING_DAYS = 15;
const REQUEST_TIMEOUT_MS = 15000;
const MAX_CONCURRENT_REQUESTS = 10;
const DAY_CACHE_TTL_MS = 15 * 60 * 1000;

function toYyyymmdd(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function isWeekday(date) {
  const day = date.getUTCDay();
  return day !== 0 && day !== 6;
}

function candidateDates(now, maxCandidates) {
  const dates = [];
  // FINRA publishes only on trading days. Leave enough room for weekends,
  // exchange holidays and the occasional unavailable daily file.
  const maxCalendarDays = Math.ceil(maxCandidates * 1.75) + 20;
  for (let i = 1; dates.length < maxCandidates && i <= maxCalendarDays; i += 1) {
    const date = new Date(now.getTime() - i * 86400000);
    if (isWeekday(date)) dates.push(toYyyymmdd(date));
  }
  return dates;
}

async function fetchDay(date, symbol, dayRequestCache) {
  const cacheKey = `${date}:${symbol}`;
  const cached = dayRequestCache.get(cacheKey);
  if (cached && Date.now() - cached.createdAt < DAY_CACHE_TTL_MS) return cached.value;

  const request = (async () => {
    try {
      const response = await axios.get(`https://cdn.finra.org/equity/regsho/daily/CNMSshvol${date}.txt`, { timeout: REQUEST_TIMEOUT_MS });
      return parseShortVolumeRow(response.data, date, symbol);
    } catch {
      return null;
    }
  })();
  dayRequestCache.set(cacheKey, { createdAt: Date.now(), value: request });

  try {
    return await request;
  } finally {
    // Keep a resolved value for the short TTL above, not an unbounded promise.
    const completed = await request;
    dayRequestCache.set(cacheKey, { createdAt: Date.now(), value: completed });
  }
}

async function fetchDays(dates, symbol, dayRequestCache) {
  const results = new Array(dates.length);
  let cursor = 0;
  async function worker() {
    while (cursor < dates.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await fetchDay(dates[index], symbol, dayRequestCache);
    }
  }
  await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENT_REQUESTS, dates.length) }, worker));
  return results;
}

function emptyMetrics(symbol, reason) {
  return { symbol, asOf: new Date().toISOString(), dataAvailable: false, unavailableReason: reason, dailyShortVolume: [] };
}

function createFinraShortVolumeDataProvider({ lookbackTradingDays = DEFAULT_LOOKBACK_TRADING_DAYS, now = () => new Date() } = {}) {
  const dayRequestCache = new Map();

  async function getSymbolShortVolumeData(symbol, { lookbackTradingDays: requestedLookback } = {}) {
    const upperSymbol = symbol.toUpperCase();
    const requestedDays = Number.isInteger(requestedLookback) && requestedLookback > 0 ? requestedLookback : lookbackTradingDays;
    const dates = candidateDates(now(), Math.ceil(requestedDays * 1.45));
    const results = await fetchDays(dates, upperSymbol, dayRequestCache);

    const dailyShortVolume = results
      .filter((result) => result !== null)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
      .slice(-requestedDays);

    if (!dailyShortVolume.length) {
      return emptyMetrics(symbol, `No real FINRA daily short-volume data could be found for "${upperSymbol}" in the recent trading-day window.`);
    }

    return { symbol, asOf: new Date().toISOString(), dataAvailable: true, unavailableReason: null, dailyShortVolume };
  }

  return { getSymbolShortVolumeData };
}

module.exports = { createFinraShortVolumeDataProvider, emptyMetrics, DEFAULT_LOOKBACK_TRADING_DAYS };
