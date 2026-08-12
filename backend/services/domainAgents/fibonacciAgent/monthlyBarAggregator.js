// Monthly candles come from the same verified daily history, so scanner
// levels remain auditable without a second provider.
function aggregateToMonthlyBars(dailyBars) {
  const months = new Map();
  for (const bar of dailyBars || []) {
    const month = String(bar.date || "").slice(0, 7);
    if (!month) continue;
    if (!months.has(month)) months.set(month, []);
    months.get(month).push(bar);
  }
  return Array.from(months.entries()).map(([month, bars]) => ({
    date: bars[bars.length - 1].date, month, open: bars[0].open, close: bars[bars.length - 1].close,
    high: Math.max(...bars.map((bar) => Number(bar.high))), low: Math.min(...bars.map((bar) => Number(bar.low))),
    volume: bars.reduce((sum, bar) => sum + (Number(bar.volume) || 0), 0),
  }));
}

module.exports = { aggregateToMonthlyBars };
