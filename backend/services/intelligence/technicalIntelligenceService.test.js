const test = require("node:test");
const assert = require("node:assert/strict");

const technicalIntelligenceService = require("./technicalIntelligenceService");

// Deterministic 100-day bar series: a steady uptrend with fixed volatility,
// no randomness — every run of these tests sees the exact same numbers.
function buildDeterministicBars(days = 100) {
  const bars = [];
  const start = new Date("2026-01-01T00:00:00.000Z");
  for (let i = 0; i < days; i++) {
    const date = new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10);
    const base = 100 + i * 0.8;
    bars.push({
      date,
      open: base - 0.5,
      high: base + 1,
      low: base - 1,
      close: base,
      volume: 1_000_000 + (i % 10) * 10_000,
    });
  }
  return bars;
}

test("analyzeBars marks enoughDataStatus SUFFICIENT with 100 real bars and INSUFFICIENT with too few", () => {
  const sufficient = technicalIntelligenceService.analyzeBars(buildDeterministicBars(100));
  assert.equal(sufficient.enoughDataStatus, "SUFFICIENT");

  const insufficient = technicalIntelligenceService.analyzeBars(buildDeterministicBars(10));
  assert.equal(insufficient.enoughDataStatus, "INSUFFICIENT");
});

test("every signal names its own enoughDataStatus independently, never a global guess", () => {
  const result = technicalIntelligenceService.analyzeBars(buildDeterministicBars(100));
  for (const [name, signal] of Object.entries(result.signals)) {
    assert.ok(["SUFFICIENT", "INSUFFICIENT"].includes(signal.enoughDataStatus), `${name} must have a real enoughDataStatus`);
    if (signal.enoughDataStatus === "INSUFFICIENT") {
      assert.equal(signal.strength, null, `${name} must not report a strength without enough data`);
    }
  }
});

test("a real uptrend series is detected as UPTREND with a real invalidation level below current price", () => {
  const result = technicalIntelligenceService.analyzeBars(buildDeterministicBars(250));
  const trend = result.signals.trend;
  assert.equal(trend.signal, "UPTREND");
  assert.ok(trend.invalidationLevel < buildDeterministicBars(250)[249].close);
});

test("RSI on a steady uptrend is not misclassified as oversold", () => {
  const result = technicalIntelligenceService.analyzeBars(buildDeterministicBars(100));
  assert.notEqual(result.signals.rsi.signal, "OVERSOLD");
});

test("every signal reports the same real timeframe passed in, never a default silently substituted", () => {
  const result = technicalIntelligenceService.analyzeBars(buildDeterministicBars(100), { timeframe: "1W" });
  for (const signal of Object.values(result.signals)) {
    assert.equal(signal.timeframe, "1W");
  }
});

test("freshness reflects the real last bar date, not the current wall-clock time", () => {
  const bars = buildDeterministicBars(100);
  const result = technicalIntelligenceService.analyzeBars(bars);
  assert.equal(result.freshness.lastBarDate, bars[bars.length - 1].date);
});

test("analyzeSymbol returns an honest INSUFFICIENT/errorState result when no price history is available (no network access in this test)", async () => {
  const result = await technicalIntelligenceService.analyzeSymbol("");
  assert.equal(result.enoughDataStatus, "INSUFFICIENT");
});

test("breakout signal fires BREAKOUT_UP when the latest close exceeds the prior 20-day high on above-average volume", () => {
  const bars = buildDeterministicBars(60);
  // Force an obvious breakout on the final bar: close far above the recent range, high volume.
  bars[bars.length - 1] = { ...bars[bars.length - 1], close: bars[bars.length - 1].close + 50, high: bars[bars.length - 1].high + 50, volume: 5_000_000 };
  const result = technicalIntelligenceService.analyzeBars(bars);
  assert.equal(result.signals.breakout.signal, "BREAKOUT_UP_CONFIRMED");
});
