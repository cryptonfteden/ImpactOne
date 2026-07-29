const test = require("node:test");
const assert = require("node:assert/strict");
const { generateReport } = require("./fibonacciAgent");
const canonicalVerdict = require("../../canonicalVerdict");

function makeBars(count, { startPrice = 100, dailyMove = 1, volatility = 0.5, volume = 1000, startDate = "2024-01-01" } = {}) {
  const bars = [];
  let price = startPrice;
  const start = new Date(`${startDate}T00:00:00Z`);
  for (let i = 0; i < count; i++) {
    price += dailyMove;
    const date = new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10);
    bars.push({ date, open: price - dailyMove, high: price + volatility, low: price - dailyMove - volatility, close: price, volume: volume + i });
  }
  return bars;
}

function fakeProvider(metrics) {
  return { getSymbolFibonacciData: async () => metrics };
}

test("generateReport: unavailable data produces an honest, fully-populated unavailable report (never partial/fabricated)", async () => {
  const metrics = { symbol: "NOPE", asOf: "2026-07-27T00:00:00.000Z", dataAvailable: false, unavailableReason: "Not enough data." };
  const report = await generateReport("NOPE", { provider: fakeProvider(metrics) });
  assert.equal(report.dataAvailable, false);
  assert.equal(report.trendContext, "NEUTRAL");
  assert.equal(report.primarySwing, null);
  assert.equal(report.confidence.confidence, 0);
  assert.deepEqual(report.highProbabilityZones, []);
  assert.ok(typeof report.aiSummary === "string" && report.aiSummary.length > 0);
});

test("generateReport: composes every mission-required output field from real, available data (real uptrending bars)", async () => {
  const dailyBars = makeBars(300, { dailyMove: 0.5, volatility: 0.3 });
  const metrics = {
    symbol: "FAKE",
    asOf: "2026-07-27T00:00:00.000Z",
    dataAvailable: true,
    unavailableReason: null,
    barsUsed: dailyBars.length,
    enoughDataStatus: "SUFFICIENT",
    freshness: { lastBarDate: dailyBars[dailyBars.length - 1].date, ageDays: 1 },
    currentPrice: dailyBars[dailyBars.length - 1].close,
    dailyBars,
    weeklyBars: dailyBars, // stand-in; only tested independently in weeklyBarAggregator.test.js
    dailyTrendSignal: { signal: "UPTREND", enoughDataStatus: "SUFFICIENT" },
    weeklyTrendSignal: { signal: "UPTREND", enoughDataStatus: "SUFFICIENT" },
  };

  const report = await generateReport("FAKE", { provider: fakeProvider(metrics) });

  assert.equal(report.symbol, "FAKE");
  assert.equal(report.dataAvailable, true);
  assert.equal(report.trendContext, "BULLISH");
  assert.ok(report.primarySwing);
  assert.equal(report.primarySwing.direction, "UP");
  assert.ok(Array.isArray(report.retracementLevels));
  assert.ok(Array.isArray(report.extensionTargets));
  assert.ok(Array.isArray(report.confluenceZones));
  assert.ok(Array.isArray(report.highProbabilityZones));
  assert.ok(["AGREE", "CONFLICT", "SINGLE_TIMEFRAME_ONLY", "UNKNOWN"].includes(report.timeframeAgreement));
  assert.ok(Number.isFinite(report.confidence.confidence));
  assert.ok(typeof report.aiSummary === "string" && report.aiSummary.length > 0);
  assert.ok(report.inputs);
});

test("generateReport: retains the real underlying metrics as `inputs` for auditability", async () => {
  const dailyBars = makeBars(300, { dailyMove: 0.5, volatility: 0.3 });
  const metrics = {
    symbol: "FAKE",
    asOf: "2026-07-27T00:00:00.000Z",
    dataAvailable: true,
    unavailableReason: null,
    barsUsed: dailyBars.length,
    enoughDataStatus: "SUFFICIENT",
    freshness: { lastBarDate: dailyBars[dailyBars.length - 1].date, ageDays: 1 },
    currentPrice: dailyBars[dailyBars.length - 1].close,
    dailyBars,
    weeklyBars: [],
    dailyTrendSignal: { signal: "UPTREND", enoughDataStatus: "SUFFICIENT" },
    weeklyTrendSignal: null,
  };
  const report = await generateReport("FAKE", { provider: fakeProvider(metrics) });
  assert.equal(report.inputs, metrics);
});

test("generateReport: never surfaces a forbidden committee verdict key anywhere in the serialized report", async () => {
  const dailyBars = makeBars(300, { dailyMove: 0.5, volatility: 0.3 });
  const metrics = {
    symbol: "FAKE",
    asOf: "2026-07-27T00:00:00.000Z",
    dataAvailable: true,
    unavailableReason: null,
    barsUsed: dailyBars.length,
    enoughDataStatus: "SUFFICIENT",
    freshness: { lastBarDate: dailyBars[dailyBars.length - 1].date, ageDays: 1 },
    currentPrice: dailyBars[dailyBars.length - 1].close,
    dailyBars,
    weeklyBars: dailyBars,
    dailyTrendSignal: { signal: "UPTREND", enoughDataStatus: "SUFFICIENT" },
    weeklyTrendSignal: { signal: "UPTREND", enoughDataStatus: "SUFFICIENT" },
  };
  const report = await generateReport("FAKE", { provider: fakeProvider(metrics) });
  const serialized = JSON.stringify(report);
  for (const forbiddenKey of canonicalVerdict.FORBIDDEN_COMMITTEE_KEYS) {
    assert.doesNotMatch(serialized, new RegExp(`"${forbiddenKey}"\\s*:`), `report must never contain the forbidden key "${forbiddenKey}"`);
  }
});

test("generateReport: gracefully degrades to a flat, no-distinct-swing series (no primary swing, but still no crash)", async () => {
  const flatBars = makeBars(300, { dailyMove: 0, volatility: 0.1 }).map((bar) => ({ ...bar, high: 100.1, low: 99.9, close: 100 }));
  const metrics = {
    symbol: "FLAT",
    asOf: "2026-07-27T00:00:00.000Z",
    dataAvailable: true,
    unavailableReason: null,
    barsUsed: flatBars.length,
    enoughDataStatus: "SUFFICIENT",
    freshness: { lastBarDate: flatBars[flatBars.length - 1].date, ageDays: 1 },
    currentPrice: 100,
    dailyBars: flatBars,
    weeklyBars: [],
    dailyTrendSignal: { signal: "MIXED", enoughDataStatus: "SUFFICIENT" },
    weeklyTrendSignal: null,
  };
  const report = await generateReport("FLAT", { provider: fakeProvider(metrics) });
  assert.equal(report.primarySwing, null);
  assert.equal(report.retracementLevels, null);
  assert.equal(report.extensionTargets, null);
  assert.equal(report.entryZone, null);
  assert.ok(typeof report.aiSummary === "string" && report.aiSummary.length > 0);
});
