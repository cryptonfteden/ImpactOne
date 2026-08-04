const test = require("node:test");
const assert = require("node:assert/strict");
const { createFibonacciDataProvider, emptyMetrics, MIN_BARS_FOR_ANALYSIS } = require("./fibonacciDataProvider");

test("emptyMetrics honestly reports dataAvailable: false with the given reason, never fabricated values", () => {
  const metrics = emptyMetrics("XYZ", "No data.");
  assert.equal(metrics.symbol, "XYZ");
  assert.equal(metrics.dataAvailable, false);
  assert.equal(metrics.unavailableReason, "No data.");
  assert.equal(metrics.barsUsed, 0);
  assert.deepEqual(metrics.dailyBars, []);
  assert.deepEqual(metrics.weeklyBars, []);
  assert.equal(metrics.dailyTrendSignal, null);
  assert.equal(metrics.weeklyTrendSignal, null);
});

test("createFibonacciDataProvider: honestly reports unavailable data when too few real daily bars exist", async () => {
  const provider = createFibonacciDataProvider();
  const originalModule = require("../../intelligence/priceHistoryProvider");
  const original = originalModule.getDailyBars;
  originalModule.getDailyBars = async () => [{ date: "2026-01-01", open: 1, high: 1, low: 1, close: 1, volume: 1 }];
  try {
    const metrics = await provider.getSymbolFibonacciData("NOPE");
    assert.equal(metrics.dataAvailable, false);
    assert.match(metrics.unavailableReason, new RegExp(`${MIN_BARS_FOR_ANALYSIS}`));
  } finally {
    originalModule.getDailyBars = original;
  }
});

test("createFibonacciDataProvider: computes real daily/weekly bars, trend signals, and current price from real bars", async () => {
  const provider = createFibonacciDataProvider({ range: "1y" });
  const originalModule = require("../../intelligence/priceHistoryProvider");
  const original = originalModule.getDailyBars;
  const bars = [];
  let price = 100;
  for (let i = 0; i < 400; i++) {
    price += 0.3;
    const date = new Date(Date.UTC(2024, 0, 1 + i)).toISOString().slice(0, 10);
    bars.push({ date, open: price - 0.3, high: price + 1, low: price - 1, close: price, volume: 1000 + i });
  }
  originalModule.getDailyBars = async () => bars;
  try {
    const metrics = await provider.getSymbolFibonacciData("SYNTH");
    assert.equal(metrics.dataAvailable, true);
    assert.equal(metrics.symbol, "SYNTH");
    assert.equal(metrics.barsUsed, 400);
    assert.equal(metrics.currentPrice, bars[bars.length - 1].close);
    assert.ok(metrics.weeklyBars.length > 0 && metrics.weeklyBars.length < metrics.dailyBars.length);
    assert.ok(metrics.dailyTrendSignal);
    assert.ok(metrics.weeklyTrendSignal, "400 daily bars should aggregate into enough weekly bars for a real weekly trend signal");
  } finally {
    originalModule.getDailyBars = original;
  }
});
