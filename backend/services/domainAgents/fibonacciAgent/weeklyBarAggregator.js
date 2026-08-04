// Phase FIBONACCI-AGENT-001 — real ISO-week aggregation of real daily
// bars into weekly bars, the second timeframe "multiple timeframe
// agreement" needs. Pure, deterministic: no separate network fetch,
// no fabricated bar — every weekly bar is built entirely from the real
// daily bars that fall in that ISO week (Mon-Sun).
function isoWeekKey(dateString) {
  const date = new Date(`${dateString}T00:00:00Z`);
  const target = new Date(date.valueOf());
  const dayNumber = (date.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  target.setUTCDate(target.getUTCDate() - dayNumber + 3); // nearest Thursday
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((target - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/**
 * @param {Array<object>} dailyBars - oldest-first daily bars
 * @returns {Array<object>} oldest-first weekly bars, each real (open of
 *   the week's first daily bar, close of its last, real max high/min
 *   low, summed real volume)
 */
function aggregateToWeeklyBars(dailyBars) {
  if (!dailyBars.length) return [];
  const weeks = new Map();
  for (const bar of dailyBars) {
    const key = isoWeekKey(bar.date);
    if (!weeks.has(key)) weeks.set(key, []);
    weeks.get(key).push(bar);
  }
  return Array.from(weeks.entries()).map(([weekKey, bars]) => ({
    date: bars[bars.length - 1].date,
    weekKey,
    open: bars[0].open,
    close: bars[bars.length - 1].close,
    high: Math.max(...bars.map((b) => b.high)),
    low: Math.min(...bars.map((b) => b.low)),
    volume: bars.reduce((sum, b) => sum + (b.volume || 0), 0),
  }));
}

module.exports = { aggregateToWeeklyBars, isoWeekKey };
