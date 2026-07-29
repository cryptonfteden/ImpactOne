const test = require("node:test");
const assert = require("node:assert/strict");
const { aggregateToWeeklyBars, isoWeekKey } = require("./weeklyBarAggregator");

test("isoWeekKey groups dates in the same Mon-Sun week under the same key", () => {
  assert.equal(isoWeekKey("2026-03-02"), isoWeekKey("2026-03-04")); // Mon, Wed same week
  assert.notEqual(isoWeekKey("2026-03-02"), isoWeekKey("2026-03-09")); // next Monday, different week
});

test("aggregateToWeeklyBars returns an empty array for no input, never throws", () => {
  assert.deepEqual(aggregateToWeeklyBars([]), []);
});

test("aggregateToWeeklyBars builds one real weekly bar per real week: open of first day, close of last, real max high/min low, summed volume", () => {
  const dailyBars = [
    { date: "2026-03-02", open: 10, high: 12, low: 9, close: 11, volume: 100 }, // Mon
    { date: "2026-03-03", open: 11, high: 15, low: 10, close: 14, volume: 200 }, // Tue
    { date: "2026-03-04", open: 14, high: 14, low: 8, close: 9, volume: 150 }, // Wed
    { date: "2026-03-09", open: 9, high: 10, low: 7, close: 8, volume: 300 }, // next Monday
  ];
  const weekly = aggregateToWeeklyBars(dailyBars);
  assert.equal(weekly.length, 2);
  assert.equal(weekly[0].open, 10);
  assert.equal(weekly[0].close, 9);
  assert.equal(weekly[0].high, 15);
  assert.equal(weekly[0].low, 8);
  assert.equal(weekly[0].volume, 450);
  assert.equal(weekly[1].open, 9);
  assert.equal(weekly[1].volume, 300);
});

test("aggregateToWeeklyBars preserves oldest-first chronological order for oldest-first input (the real contract)", () => {
  const dailyBars = [
    { date: "2026-03-02", open: 2, high: 2, low: 2, close: 2, volume: 2 },
    { date: "2026-03-09", open: 1, high: 1, low: 1, close: 1, volume: 1 },
  ];
  const weekly = aggregateToWeeklyBars(dailyBars);
  assert.ok(new Date(weekly[0].date) < new Date(weekly[1].date));
});
