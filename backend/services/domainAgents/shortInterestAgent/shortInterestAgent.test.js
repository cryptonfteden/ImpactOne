const test = require("node:test");
const assert = require("node:assert/strict");
const { generateReport } = require("./shortInterestAgent");
const canonicalVerdict = require("../../canonicalVerdict");
const priceHistoryProvider = require("../../intelligence/priceHistoryProvider");

function makeDailyShortVolume(ratios) {
  return ratios.map((ratio, i) => ({
    date: `2026072${i}`,
    symbol: "FAKE",
    shortVolume: ratio * 1000,
    shortExemptVolume: 0,
    totalVolume: 1000,
    shortVolumeRatio: ratio,
  }));
}

function fakeProvider(metrics) {
  return { getSymbolShortVolumeData: async () => metrics };
}

test("generateReport: unavailable data produces an honest, fully-populated unavailable report (never partial/fabricated)", async () => {
  const metrics = { symbol: "NOPE", asOf: "2026-07-27T00:00:00.000Z", dataAvailable: false, unavailableReason: "No real FINRA daily short-volume data could be found.", dailyShortVolume: [] };
  const report = await generateReport("NOPE", { provider: fakeProvider(metrics) });
  assert.equal(report.dataAvailable, false);
  assert.equal(report.shortInterestBias, "NEUTRAL");
  assert.equal(report.confidence.confidence, 0);
  assert.equal(report.borrowStress.dataAvailable, false);
  assert.ok(typeof report.aiSummary === "string" && report.aiSummary.length > 0);
});

test("generateReport: composes every mission-required output field from real, available data (a real declining short-volume scenario)", async () => {
  const originalGetDailyBars = priceHistoryProvider.getDailyBars;
  priceHistoryProvider.getDailyBars = async () =>
    Array.from({ length: 20 }, (_, i) => ({ date: `2026-07-${String(i + 1).padStart(2, "0")}`, open: 100 + i, high: 101 + i, low: 99 + i, close: 100 + i, volume: 1000 }));
  try {
    const metrics = {
      symbol: "FAKE",
      asOf: "2026-07-27T00:00:00.000Z",
      dataAvailable: true,
      unavailableReason: null,
      dailyShortVolume: makeDailyShortVolume([0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2]),
    };

    const report = await generateReport("FAKE", { provider: fakeProvider(metrics) });

    assert.equal(report.symbol, "FAKE");
    assert.equal(report.dataAvailable, true);
    assert.ok(["BULLISH", "NEUTRAL", "BEARISH"].includes(report.shortInterestBias));
    assert.ok(Number.isFinite(report.shortInterestScore));
    assert.ok(["INCREASING", "DECREASING", "STABLE", "UNKNOWN"].includes(report.shortInterestTrend.trend));
    assert.ok(Number.isFinite(report.squeezeProbability));
    assert.equal(report.borrowStress.dataAvailable, false);
    assert.ok(["HIGH", "MODERATE", "LOW", "UNKNOWN"].includes(report.coveringActivity.classification));
    assert.ok(Number.isFinite(report.crowdednessScore));
    assert.ok(Array.isArray(report.risks));
    assert.ok(Array.isArray(report.opportunities));
    assert.ok(Number.isFinite(report.confidence.confidence));
    assert.ok(typeof report.aiSummary === "string" && report.aiSummary.length > 0);
    assert.ok(report.inputs);
    assert.equal(report.shortInterestBias, "BULLISH");
    assert.equal(report.coveringActivity.classification, "HIGH");
  } finally {
    priceHistoryProvider.getDailyBars = originalGetDailyBars;
  }
});

test("generateReport: retains the real underlying metrics as `inputs` for auditability", async () => {
  const metrics = { symbol: "FAKE", asOf: "2026-07-27T00:00:00.000Z", dataAvailable: true, unavailableReason: null, dailyShortVolume: makeDailyShortVolume([0.3, 0.3]) };
  const report = await generateReport("FAKE", { provider: fakeProvider(metrics) });
  assert.equal(report.inputs, metrics);
});

test("generateReport: never surfaces a forbidden committee verdict key anywhere in the serialized report", async () => {
  const metrics = { symbol: "FAKE", asOf: "2026-07-27T00:00:00.000Z", dataAvailable: true, unavailableReason: null, dailyShortVolume: makeDailyShortVolume([0.3, 0.4, 0.5]) };
  const report = await generateReport("FAKE", { provider: fakeProvider(metrics) });
  const serialized = JSON.stringify(report);
  for (const forbiddenKey of canonicalVerdict.FORBIDDEN_COMMITTEE_KEYS) {
    assert.doesNotMatch(serialized, new RegExp(`"${forbiddenKey}"\\s*:`), `report must never contain the forbidden key "${forbiddenKey}"`);
  }
});

test("generateReport: gracefully handles a real flat, single-day series without crashing", async () => {
  const metrics = { symbol: "FLAT", asOf: "2026-07-27T00:00:00.000Z", dataAvailable: true, unavailableReason: null, dailyShortVolume: makeDailyShortVolume([0.3]) };
  const report = await generateReport("FLAT", { provider: fakeProvider(metrics) });
  assert.equal(report.dataAvailable, true);
  assert.equal(report.shortInterestTrend.trend, "UNKNOWN");
  assert.equal(report.shortInterestBias, "NEUTRAL");
});
