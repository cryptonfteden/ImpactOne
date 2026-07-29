const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeTrend, mapTrendDirection } = require("./trendAnalyzer");

function trendSignal(signal, status = "SUFFICIENT", strength = 50) {
  return { signal, enoughDataStatus: status, strength };
}

test("mapTrendDirection: UPTREND / ABOVE_50D_AVERAGE map to BULLISH", () => {
  assert.equal(mapTrendDirection(trendSignal("UPTREND")), "BULLISH");
  assert.equal(mapTrendDirection(trendSignal("ABOVE_50D_AVERAGE")), "BULLISH");
});

test("mapTrendDirection: DOWNTREND / BELOW_50D_AVERAGE map to BEARISH", () => {
  assert.equal(mapTrendDirection(trendSignal("DOWNTREND")), "BEARISH");
  assert.equal(mapTrendDirection(trendSignal("BELOW_50D_AVERAGE")), "BEARISH");
});

test("mapTrendDirection: MIXED maps to NEUTRAL, honestly (no undivided lean)", () => {
  assert.equal(mapTrendDirection(trendSignal("MIXED")), "NEUTRAL");
});

test("mapTrendDirection: insufficient data maps to NEUTRAL regardless of signal value", () => {
  assert.equal(mapTrendDirection(trendSignal("UPTREND", "INSUFFICIENT")), "NEUTRAL");
  assert.equal(mapTrendDirection(null), "NEUTRAL");
});

test("analyzeTrend uses real ADX for trend strength when available", () => {
  const result = analyzeTrend({ trend: trendSignal("UPTREND") }, 42.7);
  assert.equal(result.trend, "BULLISH");
  assert.equal(result.trendStrength, 43);
  assert.equal(result.trendStrengthSource, "ADX");
});

test("analyzeTrend clamps ADX-derived strength to [0, 100]", () => {
  const result = analyzeTrend({ trend: trendSignal("UPTREND") }, 150);
  assert.equal(result.trendStrength, 100);
});

test("analyzeTrend falls back to the existing signal's own strength when ADX is unavailable", () => {
  const result = analyzeTrend({ trend: trendSignal("DOWNTREND", "SUFFICIENT", 65) }, null);
  assert.equal(result.trend, "BEARISH");
  assert.equal(result.trendStrength, 65);
  assert.equal(result.trendStrengthSource, "SIGNAL_STRENGTH");
});

test("analyzeTrend honestly reports UNAVAILABLE trend strength when neither ADX nor the signal's own strength is usable", () => {
  const result = analyzeTrend({ trend: trendSignal("UPTREND", "INSUFFICIENT", null) }, null);
  assert.equal(result.trendStrength, 0);
  assert.equal(result.trendStrengthSource, "UNAVAILABLE");
});
