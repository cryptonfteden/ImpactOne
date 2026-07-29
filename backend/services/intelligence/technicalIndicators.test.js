const test = require("node:test");
const assert = require("node:assert/strict");

const indicators = require("./technicalIndicators");

function closeAlmostEqual(actual, expected, tolerance = 0.01) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${actual} to be within ${tolerance} of ${expected}`);
}

test("simpleMovingAverage computes the exact average of the last N values", () => {
  const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  assert.equal(indicators.simpleMovingAverage(values, 5), (6 + 7 + 8 + 9 + 10) / 5);
  assert.equal(indicators.simpleMovingAverage(values, 10), 5.5);
});

test("simpleMovingAverage returns null when there isn't enough data, never a partial-window guess", () => {
  assert.equal(indicators.simpleMovingAverage([1, 2, 3], 5), null);
});

test("exponentialMovingAverage matches hand-computed EMA for a short known series", () => {
  // period=3 EMA, k = 2/(3+1) = 0.5. Seed = SMA of first 3 = (1+2+3)/3 = 2.
  // Next (value=4): 4*0.5 + 2*0.5 = 3. Next (value=5): 5*0.5 + 3*0.5 = 4.
  const values = [1, 2, 3, 4, 5];
  assert.equal(indicators.exponentialMovingAverage(values, 3), 4);
});

test("relativeStrengthIndex matches the classic Wilder textbook example (~70.5)", () => {
  // The standard 14-period RSI worked example (Wilder's original series).
  const values = [
    44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84, 46.08,
    45.89, 46.03, 45.61, 46.28, 46.28,
  ];
  const rsi = indicators.relativeStrengthIndex(values, 14);
  closeAlmostEqual(rsi, 70.53, 0.5);
});

test("relativeStrengthIndex returns 100 for a strictly monotonic increasing series (no losses at all)", () => {
  const values = Array.from({ length: 20 }, (_, i) => i + 1);
  assert.equal(indicators.relativeStrengthIndex(values, 14), 100);
});

test("relativeStrengthIndex returns null with insufficient data", () => {
  assert.equal(indicators.relativeStrengthIndex([1, 2, 3], 14), null);
});

test("macd returns null with insufficient data rather than a misleading partial value", () => {
  assert.equal(indicators.macd([1, 2, 3, 4, 5]), null);
});

test("macd computes a real histogram from a real trending series", () => {
  const values = Array.from({ length: 60 }, (_, i) => 100 + i * 0.5);
  const result = indicators.macd(values, 12, 26, 9);
  assert.ok(result);
  // A steadily rising series has a positive MACD line (fast EMA above slow EMA).
  assert.ok(result.macd > 0);
  closeAlmostEqual(result.histogram, result.macd - result.signal, 0.0001);
});

test("averageTrueRange computes a real value for a simple bar series and matches hand calculation for the seed period", () => {
  const bars = [
    { high: 10, low: 8, close: 9 },
    { high: 11, low: 9, close: 10 },
    { high: 12, low: 10, close: 11 },
  ];
  // period=2: TR1 = max(11-9, |11-9|, |9-9|) = 2. TR2 = max(12-10, |12-10|, |10-10|) = 2.
  // seed ATR = (2+2)/2 = 2.
  assert.equal(indicators.averageTrueRange(bars, 2), 2);
});

test("averageTrueRange returns null with insufficient bars", () => {
  assert.equal(indicators.averageTrueRange([{ high: 1, low: 1, close: 1 }], 14), null);
});

test("volumeWeightedAveragePrice computes the real volume-weighted typical price", () => {
  const bars = [
    { high: 10, low: 8, close: 9, volume: 100 }, // typical = 9
    { high: 12, low: 10, close: 11, volume: 200 }, // typical = 11
  ];
  // VWAP = (9*100 + 11*200) / 300 = (900+2200)/300 = 10.333...
  closeAlmostEqual(indicators.volumeWeightedAveragePrice(bars), 3100 / 300, 0.001);
});

test("volumeWeightedAveragePrice returns null when no bar has real volume", () => {
  assert.equal(indicators.volumeWeightedAveragePrice([{ high: 1, low: 1, close: 1, volume: 0 }]), null);
});

test("bollingerBands computes real mean and standard-deviation-based bands", () => {
  const values = [10, 10, 10, 10, 20]; // period 5: mean = 12, variance = ((2^2)*4 + 8^2)/5 = (16+64)/5=16, stdDev=4
  const bands = indicators.bollingerBands(values, 5, 2);
  closeAlmostEqual(bands.middle, 12, 0.001);
  closeAlmostEqual(bands.upper, 12 + 8, 0.001);
  closeAlmostEqual(bands.lower, 12 - 8, 0.001);
});

test("fibonacciRetracement computes the exact standard levels between a real high and low", () => {
  const levels = indicators.fibonacciRetracement(100, 50);
  const byRatio = Object.fromEntries(levels.map((level) => [level.ratio, level.price]));
  assert.equal(byRatio[0], 100);
  assert.equal(byRatio[1], 50);
  closeAlmostEqual(byRatio[0.5], 75, 0.001);
  closeAlmostEqual(byRatio[0.618], 100 - 50 * 0.618, 0.001);
});

test("fibonacciRetracement returns null for an invalid (non-positive) range", () => {
  assert.equal(indicators.fibonacciRetracement(50, 100), null);
});

test("detectSupportResistance finds the real max high and min low over the lookback window", () => {
  const bars = [
    { high: 10, low: 8 },
    { high: 15, low: 7 },
    { high: 12, low: 9 },
    { high: 11, low: 6 },
    { high: 13, low: 8 },
  ];
  const result = indicators.detectSupportResistance(bars, 5);
  assert.equal(result.resistance, 15);
  assert.equal(result.support, 6);
});

test("detectSupportResistance returns null with too few bars", () => {
  assert.equal(indicators.detectSupportResistance([{ high: 1, low: 1 }], 60), null);
});

// Phase TECHNICAL-AGENT-001 additions below.

function makeTrendingBars(count, { startPrice = 100, dailyMove = 1, volatility = 0.5, volume = 1000 } = {}) {
  const bars = [];
  let price = startPrice;
  for (let i = 0; i < count; i++) {
    const close = price + dailyMove * i;
    bars.push({ date: `2026-01-${String((i % 28) + 1).padStart(2, "0")}`, open: close - dailyMove, high: close + volatility, low: close - dailyMove - volatility, close, volume });
  }
  return bars;
}

test("averageDirectionalIndex returns null with fewer than 2*period+1 bars", () => {
  assert.equal(indicators.averageDirectionalIndex(makeTrendingBars(20), 14), null);
});

test("averageDirectionalIndex is high (strong trend) for a real, strictly monotonic uptrend", () => {
  const bars = makeTrendingBars(60, { dailyMove: 2, volatility: 0.2 });
  const adx = indicators.averageDirectionalIndex(bars, 14);
  assert.ok(Number.isFinite(adx));
  assert.ok(adx > 40, `expected a strong-trend ADX reading, got ${adx}`);
});

test("averageDirectionalIndex is low for a real, flat/sideways series with no directional movement", () => {
  const bars = makeTrendingBars(60, { dailyMove: 0, volatility: 0.3 });
  const adx = indicators.averageDirectionalIndex(bars, 14);
  assert.ok(Number.isFinite(adx));
  assert.ok(adx < 30, `expected a weak/no-trend ADX reading, got ${adx}`);
});

test("volumeTrend returns null with too few bars for both windows", () => {
  assert.equal(indicators.volumeTrend(makeTrendingBars(10), { recentPeriod: 10, priorPeriod: 20 }), null);
});

test("volumeTrend reports a real positive percentChange when recent volume genuinely rose vs. the prior window", () => {
  const priorBars = makeTrendingBars(20, { volume: 1000 });
  const recentBars = makeTrendingBars(10, { volume: 2000 });
  const result = indicators.volumeTrend([...priorBars, ...recentBars], { recentPeriod: 10, priorPeriod: 20 });
  assert.equal(result.recentAvgVolume, 2000);
  assert.equal(result.priorAvgVolume, 1000);
  assert.equal(result.percentChange, 100);
});

test("volumeTrend reports a real negative percentChange when recent volume genuinely fell", () => {
  const priorBars = makeTrendingBars(20, { volume: 2000 });
  const recentBars = makeTrendingBars(10, { volume: 1000 });
  const result = indicators.volumeTrend([...priorBars, ...recentBars], { recentPeriod: 10, priorPeriod: 20 });
  assert.equal(result.percentChange, -50);
});

test("volumeTrend returns null (never a division-by-zero artifact) when the prior window's average volume is zero", () => {
  const priorBars = makeTrendingBars(20, { volume: 0 });
  const recentBars = makeTrendingBars(10, { volume: 1000 });
  assert.equal(indicators.volumeTrend([...priorBars, ...recentBars], { recentPeriod: 10, priorPeriod: 20 }), null);
});
