// Phase X2 — Advanced Market Chart data source. Reuses the existing,
// already-real priceHistoryProvider (Yahoo Finance daily bars) — no new
// price source. Real OHLCV per bar, never fabricated.
const priceHistoryProvider = require("../services/intelligence/priceHistoryProvider");

const VALID_RANGES = ["1y", "3mo", "1mo", "1w", "1d", "4h", "15m"];

async function getChartData(req, res, next) {
  try {
    const symbol = String(req.params.symbol || "").trim().toUpperCase();
    const range = VALID_RANGES.includes(req.query.range) ? req.query.range : "3mo";
    if (!symbol) {
      return res.status(400).json({ error: "A symbol is required." });
    }

    const bars = await priceHistoryProvider.getDailyBars(symbol, { range });
    res.json({ symbol, range, bars });
  } catch (error) {
    next(error);
  }
}

module.exports = { getChartData, VALID_RANGES };
