const test = require("node:test");
const assert = require("node:assert/strict");
const { selectMonthlyLowToHighSwing, buildMonthlyFibonacci, buildTimeframeFibonacci } = require("./fibonacciStrategy");

const month = (date, low, high) => ({ date, open: low + 1, close: high - 1, low, high, volume: 1 });

test("monthly strategy always anchors chronologically from low to high", () => {
  const swing = selectMonthlyLowToHighSwing([month("2026-01-31", 90, 120), month("2026-02-28", 80, 95), month("2026-03-31", 92, 110)]);
  assert.equal(swing.direction, "UP"); assert.equal(swing.swingLow, 80); assert.equal(swing.swingHigh, 110);
  assert.equal(swing.swingLowDate, "2026-02-28"); assert.equal(swing.swingHighDate, "2026-03-31");
});

test("approved Fibonacci labels place zero at the high and one at the low", () => {
  const daily = Array.from({ length: 12 }, (_, index) => month(index < 6 ? `2026-01-${String(index + 1).padStart(2, "0")}` : `2026-02-${String(index - 5).padStart(2, "0")}`, index < 6 ? 80 + index : 90 + index, index < 6 ? 90 + index : 100 + index));
  const result = buildMonthlyFibonacci(daily);
  assert.ok(result); assert.equal(result.levels.find((level) => level.ratio === 0).price, result.swingHigh);
  assert.equal(result.levels.find((level) => level.ratio === 1).price, result.swingLow);
  assert.deepEqual(result.levels.map((level) => level.ratio), [0, 0.886, 1]);
});

test("active-timeframe Fibonacci uses only the candles supplied for that range", () => {
  const bars = [month("2026-08-14T10:00:00Z", 100, 105), month("2026-08-14T10:15:00Z", 92, 101), month("2026-08-14T10:30:00Z", 98, 120)];
  const result = buildTimeframeFibonacci(bars, { range: "15m", candleTimeframe: "15 minute candles", source: "Massive" });
  assert.ok(result);
  assert.equal(result.strategy, "ACTIVE_TIMEFRAME_LOW_TO_HIGH");
  assert.equal(result.sourceRange, "15m");
  assert.equal(result.candleTimeframe, "15 minute candles");
  assert.equal(result.barCount, 3);
  assert.equal(result.swingLow, 92);
  assert.equal(result.swingHigh, 120);
  assert.deepEqual(result.levels.map((level) => level.ratio), [0, 0.886, 1]);
});

test("active-timeframe Fibonacci refuses a high that occurs before the low", () => {
  const bars = [month("2026-08-11", 90, 150), month("2026-08-12", 80, 85)];
  assert.equal(buildTimeframeFibonacci(bars, { range: "1d" }), null);
});

test("weekly Fibonacci ignores an obsolete IPO-era swing and matches the 52-week strategy horizon", () => {
  const oldHistory = Array.from({ length: 8 }, (_, index) => month(`2016-${String(index + 1).padStart(2, "0")}-01`, 14.3 + index, index === 7 ? 240 : 25 + index));
  const recent = Array.from({ length: 52 }, (_, index) => month(`2025-${String(index + 1).padStart(2, "0")}-01`, 100 + index * 0.1, 110 + index * 0.1));
  recent[20] = month("2026-04-06", 80.5, 92);
  recent[28] = month("2026-06-01", 112, 139.3);
  const result = buildTimeframeFibonacci([...oldHistory, ...recent], { range: "1w", lookbackBars: 52 });
  assert.ok(result);
  assert.equal(result.barCount, 60);
  assert.equal(result.analysisBarCount, 52);
  assert.equal(result.swingLow, 80.5);
  assert.equal(result.swingHigh, 139.3);
  assert.equal(result.swingLowDate, "2026-04-06");
  assert.equal(result.swingHighDate, "2026-06-01");
  assert.equal(Number(result.levels.find((level) => level.ratio === 0.886).price.toFixed(4)), 87.2032);
});
