const EXPECTED_INTERVAL_MS = {
  "15m": 15 * 60 * 1000,
  "4h": 4 * 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
  "1w": 7 * 24 * 60 * 60 * 1000,
  "1mo": 28 * 24 * 60 * 60 * 1000,
  "3mo": 80 * 24 * 60 * 60 * 1000,
  "1y": 300 * 24 * 60 * 60 * 1000,
};

function normalizeChartBars(input) {
  const seen = new Set();
  return (Array.isArray(input) ? input : [])
    .flatMap((bar) => {
      const timestamp = new Date(bar?.date).getTime();
      const open = Number(bar?.open), high = Number(bar?.high), low = Number(bar?.low), close = Number(bar?.close), volume = Number(bar?.volume || 0);
      if (!Number.isFinite(timestamp) || ![open, high, low, close, volume].every(Number.isFinite)) return [];
      if (timestamp > Date.now() + 10 * 60 * 1000 || open <= 0 || high <= 0 || low <= 0 || close <= 0 || volume < 0) return [];
      if (high < Math.max(open, close, low) || low > Math.min(open, close, high)) return [];
      return [{ date: new Date(timestamp).toISOString(), open, high, low, close, volume }];
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .filter((bar) => { const key = new Date(bar.date).getTime(); if (seen.has(key)) return false; seen.add(key); return true; });
}

function sessionKey(date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(date));
}

function auditChartBars(input, timeframe, options = {}) {
  const bars = normalizeChartBars(input);
  const expectedIntervalMs = EXPECTED_INTERVAL_MS[timeframe] || null;
  let comparableGaps = 0, correctGaps = 0;
  if (expectedIntervalMs) {
    for (let index = 1; index < bars.length; index += 1) {
      const sameSession = !options.regularUsSession || sessionKey(bars[index - 1].date) === sessionKey(bars[index].date);
      if (!sameSession) continue;
      comparableGaps += 1;
      const gap = new Date(bars[index].date) - new Date(bars[index - 1].date);
      if (gap >= expectedIntervalMs * 0.9 && gap <= expectedIntervalMs * 3.1) correctGaps += 1;
    }
  }
  const continuity = comparableGaps ? correctGaps / comparableGaps : 1;
  const invalidRows = Math.max(0, (Array.isArray(input) ? input.length : 0) - bars.length);
  const valid = bars.length > 0 && invalidRows === 0 && continuity >= 0.95;
  return { valid, bars, invalidRows, continuity: Number(continuity.toFixed(3)), expectedIntervalMs, reason: !bars.length ? "NO_VALID_BARS" : invalidRows ? "INVALID_OHLC_ROWS" : continuity < 0.95 ? "BROKEN_TIME_SEQUENCE" : null };
}

module.exports = { EXPECTED_INTERVAL_MS, normalizeChartBars, auditChartBars };
