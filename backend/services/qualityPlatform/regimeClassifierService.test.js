require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const priceHistoryProvider = require("../intelligence/priceHistoryProvider");
const regimeClassifierService = require("./regimeClassifierService");

function makeBars({ count, dailyReturnPct }) {
  const bars = [];
  let price = 100;
  for (let i = 0; i < count; i += 1) {
    bars.push({ date: `2026-01-${String((i % 28) + 1).padStart(2, "0")}`, open: price, high: price * 1.01, low: price * 0.99, close: price, volume: 1 });
    price *= 1 + dailyReturnPct / 100;
  }
  return bars;
}

test("classifyRegime returns UNKNOWN (never fabricated) when there is insufficient real price history", () => {
  const result = regimeClassifierService.classifyRegime({ macroRegime: { recessionRisk: "low", inflationPressure: "low" }, spyBars: [] });
  assert.equal(result.regime, "UNKNOWN");
  assert.ok(result.reason);
});

test("classifyRegime detects HIGH_VOLATILITY_BEAR from real high-volatility, negative-trend bars", () => {
  const bars = [];
  let price = 100;
  for (let i = 0; i < 60; i += 1) {
    price *= i % 2 === 0 ? 1.03 : 0.94; // large daily swings, net downward
    bars.push({ date: `d${i}`, open: price, high: price, low: price, close: price, volume: 1 });
  }
  const result = regimeClassifierService.classifyRegime({ macroRegime: {}, spyBars: bars });
  assert.equal(result.regime, "HIGH_VOLATILITY_BEAR");
});

test("classifyRegime detects BULL_TREND_LOW_VOL from real steady-upward, low-volatility bars", () => {
  const bars = makeBars({ count: 60, dailyReturnPct: 0.15 });
  const result = regimeClassifierService.classifyRegime({ macroRegime: {}, spyBars: bars });
  assert.equal(result.regime, "BULL_TREND_LOW_VOL");
});

test("classifyRegime detects BEAR_TREND from real steady-downward bars", () => {
  const bars = makeBars({ count: 60, dailyReturnPct: -0.2 });
  const result = regimeClassifierService.classifyRegime({ macroRegime: {}, spyBars: bars });
  assert.equal(result.regime, "BEAR_TREND");
});

test("classifyRegime detects RISK_OFF from real high recession/inflation macro state with a flat market", () => {
  const bars = makeBars({ count: 60, dailyReturnPct: 0 });
  const result = regimeClassifierService.classifyRegime({ macroRegime: { recessionRisk: "high", inflationPressure: "low" }, spyBars: bars });
  assert.equal(result.regime, "RISK_OFF");
});

test("classifyRegime falls back to MIXED_UNKNOWN when no rule fires with a clear margin — never guesses", () => {
  const bars = makeBars({ count: 60, dailyReturnPct: 0.02 });
  const result = regimeClassifierService.classifyRegime({ macroRegime: { recessionRisk: "medium", inflationPressure: "moderate" }, spyBars: bars });
  assert.equal(result.regime, "MIXED_UNKNOWN");
});

test("classifyRegime is deterministic — identical inputs always produce identical output", () => {
  const bars = makeBars({ count: 60, dailyReturnPct: 0.15 });
  const first = regimeClassifierService.classifyRegime({ macroRegime: { recessionRisk: "low", inflationPressure: "low" }, spyBars: bars });
  const second = regimeClassifierService.classifyRegime({ macroRegime: { recessionRisk: "low", inflationPressure: "low" }, spyBars: bars });
  assert.deepEqual(first, second);
});

test("computeRegimeSnapshot never throws and always includes rulesetVersion + computedAt, even on a price-history failure", async () => {
  const originalGetDailyBars = priceHistoryProvider.getDailyBars;
  priceHistoryProvider.getDailyBars = async () => {
    throw new Error("network down");
  };
  try {
    const snapshot = await regimeClassifierService.computeRegimeSnapshot({ macroRegime: {} });
    assert.equal(snapshot.regime, "UNKNOWN");
    assert.equal(snapshot.rulesetVersion, regimeClassifierService.REGIME_RULESET_VERSION);
    assert.ok(snapshot.computedAt);
  } finally {
    priceHistoryProvider.getDailyBars = originalGetDailyBars;
  }
});
