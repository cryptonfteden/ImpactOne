const test = require("node:test");
const assert = require("node:assert/strict");
const { generateReport } = require("./technicalAgent");
const canonicalVerdict = require("../../canonicalVerdict");

function sufficientSignal(overrides) {
  return { enoughDataStatus: "SUFFICIENT", ...overrides };
}

function fakeAvailableMetrics(overrides = {}) {
  return {
    symbol: "FAKE",
    asOf: "2026-07-27T00:00:00.000Z",
    dataAvailable: true,
    unavailableReason: null,
    barsUsed: 250,
    enoughDataStatus: "SUFFICIENT",
    freshness: { lastBarDate: "2026-07-27", ageDays: 1 },
    adx: 35,
    volumeTrend: { recentAvgVolume: 2000, priorAvgVolume: 1000, percentChange: 100 },
    supportResistanceDetail: { support: 90, resistance: 110, recentPivotHighs: [108], recentPivotLows: [92] },
    signals: {
      trend: sufficientSignal({ signal: "UPTREND", strength: 60, calculationInputs: { lastClose: 100, sma50: 95, sma200: 90 } }),
      rsi: sufficientSignal({ signal: "NEUTRAL", calculationInputs: { value: 55 } }),
      macd: sufficientSignal({ signal: "BULLISH_CROSSOVER", calculationInputs: { histogram: 1.2 } }),
      atr: sufficientSignal({ calculationInputs: { value: 2, lastClose: 100 } }),
      volatilityRegime: sufficientSignal({ signal: "NORMAL_VOLATILITY" }),
      breakout: sufficientSignal({ signal: "NO_BREAKOUT", calculationInputs: { priorHigh: 110, priorLow: 90, lastClose: 100 } }),
      fibonacciRetracement: { levels: [{ ratio: 0.382, price: 105 }] },
    },
    ...overrides,
  };
}

function fakeProvider(metrics) {
  return { getSymbolTechnicals: async () => metrics };
}

test("generateReport: unavailable data produces an honest, fully-populated unavailable report (never partial/fabricated)", async () => {
  const metrics = { symbol: "NOPE", asOf: "2026-07-27T00:00:00.000Z", dataAvailable: false, unavailableReason: "No price history available." };
  const report = await generateReport("NOPE", { provider: fakeProvider(metrics) });
  assert.equal(report.dataAvailable, false);
  assert.equal(report.trend, "NEUTRAL");
  assert.equal(report.confidence.confidence, 0);
  assert.equal(report.levels.supportLevels.length, 0);
  assert.ok(typeof report.aiSummary === "string" && report.aiSummary.length > 0);
});

test("generateReport: composes every mission-required output field from real, available data", async () => {
  const report = await generateReport("FAKE", { provider: fakeProvider(fakeAvailableMetrics()) });
  assert.equal(report.symbol, "FAKE");
  assert.equal(report.dataAvailable, true);
  assert.equal(report.trend, "BULLISH");
  assert.ok(Number.isFinite(report.trendStrength));
  assert.ok(report.momentum && report.momentum.state);
  assert.ok(Array.isArray(report.levels.supportLevels));
  assert.ok(Array.isArray(report.levels.resistanceLevels));
  assert.ok("probability" in report.breakout);
  assert.ok(["LOW", "MODERATE", "HIGH"].includes(report.risk.riskLevel));
  assert.ok(Number.isFinite(report.confidence.confidence));
  assert.ok(typeof report.aiSummary === "string" && report.aiSummary.length > 0);
  assert.ok(report.inputs);
});

test("generateReport: retains the real underlying metrics as `inputs` for auditability", async () => {
  const metrics = fakeAvailableMetrics();
  const report = await generateReport("FAKE", { provider: fakeProvider(metrics) });
  assert.equal(report.inputs, metrics);
});

test("generateReport: never surfaces a forbidden committee verdict key anywhere in the serialized report", async () => {
  const report = await generateReport("FAKE", { provider: fakeProvider(fakeAvailableMetrics()) });
  const serialized = JSON.stringify(report);
  for (const forbiddenKey of canonicalVerdict.FORBIDDEN_COMMITTEE_KEYS) {
    assert.doesNotMatch(serialized, new RegExp(`"${forbiddenKey}"\\s*:`), `report must never contain the forbidden key "${forbiddenKey}"`);
  }
});
