const test = require("node:test");
const assert = require("node:assert/strict");
const { aggregateDailyToWeeklyBars } = require("./priceHistoryProvider");

test("aggregateDailyToWeeklyBars creates chronological real weekly OHLCV bars", () => {
  const result = aggregateDailyToWeeklyBars([
    { date: "2026-08-03", open: 10, high: 12, low: 9, close: 11, volume: 100 },
    { date: "2026-08-04", open: 11, high: 14, low: 10, close: 13, volume: 150 },
    { date: "2026-08-10", open: 13, high: 15, low: 12, close: 14, volume: 200 },
  ]);
  assert.deepEqual(result, [
    { date: "2026-08-03", open: 10, high: 14, low: 9, close: 13, volume: 250 },
    { date: "2026-08-10", open: 13, high: 15, low: 12, close: 14, volume: 200 },
  ]);
});
