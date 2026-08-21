// Phase X2 — Advanced Market Chart data source. Reuses the existing,
// already-real priceHistoryProvider (Yahoo Finance daily bars) — no new
// price source. Real OHLCV per bar, never fabricated.
const priceHistoryProvider = require("../services/intelligence/priceHistoryProvider");

const VALID_RANGES = ["1y", "3mo", "1mo", "1w", "1d", "4h", "15m"];
const RANGE_METADATA = {
  "15m": { label: "15 minutes", candleInterval: "1 minute", minBars: 10 },
  "4h": { label: "4 hours", candleInterval: "5 minutes", minBars: 36 },
  "1d": { label: "1 day", candleInterval: "5 minutes", minBars: 60 },
  // A regular US trading week runs from Monday 09:30 to Friday 16:00 ET,
  // which is roughly 4.25 elapsed calendar days rather than five full days.
  "1w": { label: "1 week", candleInterval: "30 minutes", minBars: 40, minSpanDays: 4 },
  "1mo": { label: "1 month", candleInterval: "1 day", minBars: 15, minSpanDays: 24 },
  "3mo": { label: "3 months", candleInterval: "1 day", minBars: 45, minSpanDays: 75 },
  "1y": { label: "1 year", candleInterval: "1 week", minBars: 40, minSpanDays: 300 },
};

function assessCoverage(bars, range) {
  const rule = RANGE_METADATA[range];
  const first = bars[0]?.date || null, last = bars.at(-1)?.date || null;
  const spanDays = first && last ? Math.max(0, (new Date(last) - new Date(first)) / 86400000) : 0;
  const complete = bars.length >= rule.minBars && (!rule.minSpanDays || spanDays >= rule.minSpanDays);
  return { complete, spanDays: Number(spanDays.toFixed(1)), reason: complete ? null : `Only ${bars.length} verified bars across ${Number(spanDays.toFixed(1))} days are available; ${rule.label} requires ${rule.minBars} bars${rule.minSpanDays ? ` across at least ${rule.minSpanDays} days` : ""}.` };
}

async function getChartData(req, res, next) {
  try {
    const symbol = String(req.params.symbol || "").trim().toUpperCase();
    const range = VALID_RANGES.includes(req.query.range) ? req.query.range : "3mo";
    if (!symbol) {
      return res.status(400).json({ error: "A symbol is required." });
    }

    const bars = await priceHistoryProvider.getChartBars(symbol, { range });
    const source = bars.length ? priceHistoryProvider.getChartSource(symbol, range) : { source: null, sourceRole: "unavailable" };
    const coverage = assessCoverage(bars, range);
    res.json({
      symbol,
      range,
      bars,
      source: source.source,
      sourceRole: source.sourceRole,
      timeframe: {
        ...RANGE_METADATA[range],
        barCount: bars.length,
        coverageStart: bars[0]?.date || null,
        coverageEnd: bars.at(-1)?.date || null,
        ...coverage,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getChartData, VALID_RANGES, RANGE_METADATA, assessCoverage };
