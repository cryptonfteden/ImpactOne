// Phase MACRO-AGENT-001 — real market-based proxies for VIX, oil,
// gold, and USD strength, via the existing, unmodified
// priceHistoryProvider.js (real Yahoo Finance daily bars, no-auth,
// symbol-agnostic — confirmed during development to accept real
// futures/index tickers like `^VIX`/`CL=F`/`GC=F`/`DX-Y.NYB` with no
// allowlist restriction).
const priceHistoryProvider = require("../../intelligence/priceHistoryProvider");

const RECENT_WINDOW_TRADING_DAYS = 21; // roughly one real trading month

function emptyProxyMetrics(symbol, reason) {
  return { symbol, dataAvailable: false, unavailableReason: reason, latestClose: null, priorClose: null, changePercent: null };
}

/**
 * @param {string} symbol - a real Yahoo Finance ticker (e.g. "^VIX")
 * @returns {Promise<{ symbol: string, dataAvailable: boolean, unavailableReason: string|null, latestClose: number|null, priorClose: number|null, changePercent: number|null }>}
 */
async function fetchMarketProxy(symbol) {
  const bars = await priceHistoryProvider.getDailyBars(symbol, { range: "3mo" });
  if (!bars.length) {
    return emptyProxyMetrics(symbol, `No real price history available for "${symbol}".`);
  }

  const recentBars = bars.slice(-RECENT_WINDOW_TRADING_DAYS);
  const latestClose = recentBars[recentBars.length - 1].close;
  const priorClose = recentBars[0].close;
  if (!Number.isFinite(latestClose) || !Number.isFinite(priorClose) || priorClose === 0) {
    return emptyProxyMetrics(symbol, `Real price history for "${symbol}" did not include usable close values.`);
  }

  const changePercent = Math.round(((latestClose - priorClose) / priorClose) * 10000) / 100;
  return { symbol, dataAvailable: true, unavailableReason: null, latestClose, priorClose, changePercent };
}

module.exports = { fetchMarketProxy, emptyProxyMetrics, RECENT_WINDOW_TRADING_DAYS };
