// Sprint 37 — real OHLCV history for technicalIntelligenceService. Uses the
// same no-auth-required Yahoo Finance chart endpoint
// finnhubService.getHistoricalSeries already calls for the Home portfolio
// sparkline — but that function only extracts closes. This extracts full
// open/high/low/close/volume bars, needed for ATR/VWAP/support-resistance,
// without touching finnhubService.js or any of its existing callers.
const axios = require("axios");

async function getDailyBars(symbol, { range = "1y" } = {}) {
  const normalizedSymbol = String(symbol || "").trim().toUpperCase();
  if (!normalizedSymbol) return [];

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

module.exports = { getDailyBars };
