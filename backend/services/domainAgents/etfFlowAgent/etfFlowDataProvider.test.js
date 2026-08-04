const test = require("node:test");
const assert = require("node:assert/strict");
const { createEtfFlowDataProvider, emptyMetrics } = require("./etfFlowDataProvider");
const stockSectorResolver = require("./stockSectorResolver");
const priceHistoryProvider = require("../../intelligence/priceHistoryProvider");

function bars(count) {
  return Array.from({ length: count }, (_, i) => ({ date: `2026-01-${String((i % 28) + 1).padStart(2, "0")}`, open: 100, high: 101, low: 99, close: 100 + i, volume: 1000 }));
}

test("emptyMetrics honestly reports dataAvailable: false with the given reason, never fabricated bars", () => {
  const metrics = emptyMetrics("XYZ", "no data");
  assert.equal(metrics.dataAvailable, false);
  assert.equal(metrics.unavailableReason, "no data");
  assert.deepEqual(metrics.etfBars, []);
  assert.deepEqual(metrics.marketBars, []);
});

test("createEtfFlowDataProvider: analyzes a recognized ETF symbol directly, without any sector resolution call", async () => {
  const originalGetDailyBars = priceHistoryProvider.getDailyBars;
  let resolveCalled = false;
  const originalResolve = stockSectorResolver.resolveStockSector;
  stockSectorResolver.resolveStockSector = async () => {
    resolveCalled = true;
    return { sector: null, dataAvailable: false, unavailableReason: "should not be called" };
  };
  priceHistoryProvider.getDailyBars = async (symbol) => (symbol === "SPY" ? bars(30) : bars(60));
  try {
    const provider = createEtfFlowDataProvider();
    const metrics = await provider.getSymbolEtfFlowData("XLK");
    assert.equal(metrics.dataAvailable, true);
    assert.equal(metrics.targetEtf, "XLK");
    assert.equal(metrics.isDirectEtf, true);
    assert.equal(metrics.sector, "Technology");
    assert.equal(resolveCalled, false, "a recognized ETF must never trigger the stock-sector resolution path");
  } finally {
    priceHistoryProvider.getDailyBars = originalGetDailyBars;
    stockSectorResolver.resolveStockSector = originalResolve;
  }
});

test("createEtfFlowDataProvider: resolves a real stock symbol to its sector ETF as an indirect proxy target", async () => {
  const originalGetDailyBars = priceHistoryProvider.getDailyBars;
  const originalResolve = stockSectorResolver.resolveStockSector;
  stockSectorResolver.resolveStockSector = async () => ({ sector: "Technology", dataAvailable: true, unavailableReason: null });
  priceHistoryProvider.getDailyBars = async () => bars(60);
  try {
    const provider = createEtfFlowDataProvider();
    const metrics = await provider.getSymbolEtfFlowData("AAPL");
    assert.equal(metrics.dataAvailable, true);
    assert.equal(metrics.targetEtf, "XLK");
    assert.equal(metrics.isDirectEtf, false);
    assert.equal(metrics.sector, "Technology");
  } finally {
    priceHistoryProvider.getDailyBars = originalGetDailyBars;
    stockSectorResolver.resolveStockSector = originalResolve;
  }
});

test("createEtfFlowDataProvider: honestly reports unavailable when a real stock symbol's sector cannot be resolved", async () => {
  const originalResolve = stockSectorResolver.resolveStockSector;
  stockSectorResolver.resolveStockSector = async () => ({ sector: null, dataAvailable: false, unavailableReason: "No Finnhub API key is configured." });
  try {
    const provider = createEtfFlowDataProvider();
    const metrics = await provider.getSymbolEtfFlowData("AAPL");
    assert.equal(metrics.dataAvailable, false);
    assert.match(metrics.unavailableReason, /Finnhub/);
  } finally {
    stockSectorResolver.resolveStockSector = originalResolve;
  }
});

test("createEtfFlowDataProvider: honestly reports unavailable when a resolved sector has no recognized sector ETF mapping", async () => {
  const originalResolve = stockSectorResolver.resolveStockSector;
  stockSectorResolver.resolveStockSector = async () => ({ sector: "Some Unmapped Sector", dataAvailable: true, unavailableReason: null });
  try {
    const provider = createEtfFlowDataProvider();
    const metrics = await provider.getSymbolEtfFlowData("WEIRD");
    assert.equal(metrics.dataAvailable, false);
    assert.match(metrics.unavailableReason, /No recognized sector ETF mapping/);
  } finally {
    stockSectorResolver.resolveStockSector = originalResolve;
  }
});

test("createEtfFlowDataProvider: honestly reports unavailable when no real price history exists for the resolved ETF", async () => {
  const originalGetDailyBars = priceHistoryProvider.getDailyBars;
  priceHistoryProvider.getDailyBars = async () => [];
  try {
    const provider = createEtfFlowDataProvider();
    const metrics = await provider.getSymbolEtfFlowData("XLK");
    assert.equal(metrics.dataAvailable, false);
    assert.match(metrics.unavailableReason, /No real price history/);
  } finally {
    priceHistoryProvider.getDailyBars = originalGetDailyBars;
  }
});

test("createEtfFlowDataProvider: never fetches a redundant market-reference series when the target ETF IS the market reference (SPY)", async () => {
  const originalGetDailyBars = priceHistoryProvider.getDailyBars;
  let callCount = 0;
  priceHistoryProvider.getDailyBars = async () => {
    callCount += 1;
    return bars(30);
  };
  try {
    const provider = createEtfFlowDataProvider();
    const metrics = await provider.getSymbolEtfFlowData("SPY");
    assert.equal(metrics.dataAvailable, true);
    assert.deepEqual(metrics.marketBars, []);
    assert.equal(callCount, 1, "only the target ETF's own bars should be fetched, never a redundant self-comparison");
  } finally {
    priceHistoryProvider.getDailyBars = originalGetDailyBars;
  }
});
