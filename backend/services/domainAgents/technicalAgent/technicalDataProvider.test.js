const test = require("node:test");
const assert = require("node:assert/strict");
const { createTechnicalDataProvider, emptyMetrics } = require("./technicalDataProvider");

test("emptyMetrics honestly reports dataAvailable: false with the given reason, never fabricated values", () => {
  const metrics = emptyMetrics("XYZ", "No price history available.");
  assert.equal(metrics.symbol, "XYZ");
  assert.equal(metrics.dataAvailable, false);
  assert.equal(metrics.unavailableReason, "No price history available.");
  assert.equal(metrics.barsUsed, 0);
  assert.equal(metrics.enoughDataStatus, "INSUFFICIENT");
  assert.deepEqual(metrics.signals, {});
  assert.equal(metrics.adx, null);
  assert.equal(metrics.volumeTrend, null);
  assert.equal(metrics.supportResistanceDetail, null);
});

test("createTechnicalDataProvider: honestly reports unavailable data when the underlying price provider returns no bars", async () => {
  const provider = createTechnicalDataProvider();
  const originalModule = require("../../intelligence/priceHistoryProvider");
  const original = originalModule.getDailyBars;
  originalModule.getDailyBars = async () => [];
  try {
    const metrics = await provider.getSymbolTechnicals("NOPE");
    assert.equal(metrics.dataAvailable, false);
    assert.equal(metrics.symbol, "NOPE");
  } finally {
    originalModule.getDailyBars = original;
  }
});

test("createTechnicalDataProvider: computes real ADX, volumeTrend, and supportResistanceDetail from real bars", async () => {
  const provider = createTechnicalDataProvider({ range: "1y" });
  const originalModule = require("../../intelligence/priceHistoryProvider");
  const original = originalModule.getDailyBars;
  const bars = [];
  let price = 100;
  for (let i = 0; i < 120; i++) {
    price += 0.5;
    bars.push({
      date: `2026-${String((i % 12) + 1).padStart(2, "0")}-01`,
      open: price - 0.5,
      high: price + 1,
      low: price - 1,
      close: price,
      volume: 1000 + i * 5,
    });
  }
  originalModule.getDailyBars = async () => bars;
  try {
    const metrics = await provider.getSymbolTechnicals("SYNTH");
    assert.equal(metrics.dataAvailable, true);
    assert.equal(metrics.symbol, "SYNTH");
    assert.ok(Number.isFinite(metrics.adx));
    assert.ok(metrics.volumeTrend && Number.isFinite(metrics.volumeTrend.percentChange));
    assert.ok(metrics.supportResistanceDetail);
    assert.ok(metrics.signals && metrics.signals.trend);
  } finally {
    originalModule.getDailyBars = original;
  }
});
