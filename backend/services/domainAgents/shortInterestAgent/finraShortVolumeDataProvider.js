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
const MAX_CANDIDATE_CALENDAR_DAYS = 30; // real, disclosed cap on how far back to look for enough real weekdays
const REQUEST_TIMEOUT_MS = 15000;

function toYyyymmdd(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function isWeekday(date) {
  const day = date.getUTCDay();
  return day !== 0 && day !== 6;
}

function candidateDates(now, maxCandidates) {
  const dates = [];
  for (let i = 1; dates.length < maxCandidates && i <= MAX_CANDIDATE_CALENDAR_DAYS; i += 1) {
    const date = new Date(now.getTime() - i * 86400000);
    if (isWeekday(date)) dates.push(toYyyymmdd(date));
  }
  return dates;
}

async function fetchDay(date, symbol) {
  try {
    const response = await axios.get(`https://cdn.finra.org/equity/regsho/daily/CNMSshvol${date}.txt`, { timeout: REQUEST_TIMEOUT_MS });
    return parseShortVolumeRow(response.data, date, symbol);
  } catch {
    return null;
  }
}

function emptyMetrics(symbol, reason) {
  return { symbol, asOf: new Date().toISOString(), dataAvailable: false, unavailableReason: reason, dailyShortVolume: [] };
}

function createFinraShortVolumeDataProvider({ lookbackTradingDays = DEFAULT_LOOKBACK_TRADING_DAYS, now = () => new Date() } = {}) {
  async function getSymbolShortVolumeData(symbol) {
    const upperSymbol = symbol.toUpperCase();
    const dates = candidateDates(now(), lookbackTradingDays * 2); // over-fetch candidates; holidays/failures will thin this out
    const results = await Promise.all(dates.map((date) => fetchDay(date, upperSymbol)));

    const dailyShortVolume = results
      .filter((result) => result !== null)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
      .slice(-lookbackTradingDays);

    if (!dailyShortVolume.length) {
      return emptyMetrics(symbol, `No real FINRA daily short-volume data could be found for "${upperSymbol}" in the recent trading-day window.`);
    }

    return { symbol, asOf: new Date().toISOString(), dataAvailable: true, unavailableReason: null, dailyShortVolume };
  }

  return { getSymbolShortVolumeData };
}

module.exports = { createFinraShortVolumeDataProvider, emptyMetrics, DEFAULT_LOOKBACK_TRADING_DAYS };
