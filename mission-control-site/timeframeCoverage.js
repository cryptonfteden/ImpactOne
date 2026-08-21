const COVERAGE_RULES = {
  "15m": { minBars: 20, label: "15-minute candles" },
  "4h": { minBars: 20, label: "4-hour candles" },
  "1d": { minBars: 20, label: "daily candles" },
  "1w": { minBars: 20, label: "weekly candles" },
  "1mo": { minBars: 12, label: "monthly candles" },
  "3mo": { minBars: 8, label: "quarterly candles" },
  "1y": { minBars: 2, label: "yearly candles" },
};

function suggestedRange(spanDays, barCount) {
  if (spanDays >= 300) return "1y";
  if (spanDays >= 75) return "3mo";
  if (spanDays >= 24) return "1mo";
  if (spanDays >= 6) return "1w";
  if (barCount >= 70) return "1d";
  if (barCount >= 48) return "4h";
  return barCount >= 15 ? "15m" : null;
}

function assessTimeframeCoverage(bars, timeframe) {
  const rule = COVERAGE_RULES[timeframe] || { minBars: 1, label: timeframe };
  const valid = (Array.isArray(bars) ? bars : []).filter((bar) => Number.isFinite(new Date(bar?.date).getTime())).sort((a, b) => new Date(a.date) - new Date(b.date));
  const first = valid[0]?.date || null;
  const last = valid.at(-1)?.date || null;
  const spanDays = first && last ? Math.max(0, (new Date(last) - new Date(first)) / 86400000) : 0;
  const complete = valid.length >= rule.minBars && (!rule.minSpanDays || spanDays >= rule.minSpanDays);
  return { complete, requested: timeframe, requestedLabel: rule.label, actualBars: valid.length, minimumBars: rule.minBars, actualSpanDays: Number(spanDays.toFixed(1)), minimumSpanDays: rule.minSpanDays || null, firstAvailable: first, lastAvailable: last, suggestedRange: suggestedRange(spanDays, valid.length) };
}

module.exports = { COVERAGE_RULES, assessTimeframeCoverage };
