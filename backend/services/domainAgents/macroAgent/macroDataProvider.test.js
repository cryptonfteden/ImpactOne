const test = require("node:test");
const assert = require("node:assert/strict");
const { createMacroDataProvider, FRED_SERIES, MARKET_PROXIES } = require("./macroDataProvider");
const fredSeriesProvider = require("./fredSeriesProvider");
const marketProxyProvider = require("./marketProxyProvider");

function fakeSeries(seriesId, available = true) {
  return available
    ? { seriesId, dataAvailable: true, unavailableReason: null, latest: { date: "2026-06-01", value: 1 }, priorYearAgo: { date: "2025-06-01", value: 1 }, changeYoY: 0, observations: [] }
    : { seriesId, dataAvailable: false, unavailableReason: "simulated failure", latest: null, priorYearAgo: null, changeYoY: null, observations: [] };
}

function fakeProxy(symbol, available = true) {
  return available
    ? { symbol, dataAvailable: true, unavailableReason: null, latestClose: 100, priorClose: 90, changePercent: 11.11 }
    : { symbol, dataAvailable: false, unavailableReason: "simulated failure", latestClose: null, priorClose: null, changePercent: null };
}

test("getMacroData: fetches all 7 real FRED series and 4 real market proxies, keyed by name", async () => {
  const originalFetchFredSeries = fredSeriesProvider.fetchFredSeries;
  const originalFetchMarketProxy = marketProxyProvider.fetchMarketProxy;
  fredSeriesProvider.fetchFredSeries = async (seriesId) => fakeSeries(seriesId);
  marketProxyProvider.fetchMarketProxy = async (symbol) => fakeProxy(symbol);
  try {
    const provider = createMacroDataProvider();
    const metrics = await provider.getMacroData();
    assert.equal(metrics.dataAvailable, true);
    for (const key of Object.keys(FRED_SERIES)) {
      assert.equal(metrics[key].seriesId, FRED_SERIES[key]);
    }
    for (const key of Object.keys(MARKET_PROXIES)) {
      assert.equal(metrics[key].symbol, MARKET_PROXIES[key]);
    }
  } finally {
    fredSeriesProvider.fetchFredSeries = originalFetchFredSeries;
    marketProxyProvider.fetchMarketProxy = originalFetchMarketProxy;
  }
});

test("getMacroData: dataAvailable stays true when only some real sources succeed", async () => {
  const originalFetchFredSeries = fredSeriesProvider.fetchFredSeries;
  const originalFetchMarketProxy = marketProxyProvider.fetchMarketProxy;
  fredSeriesProvider.fetchFredSeries = async (seriesId) => fakeSeries(seriesId, seriesId === "FEDFUNDS");
  marketProxyProvider.fetchMarketProxy = async (symbol) => fakeProxy(symbol, false);
  try {
    const provider = createMacroDataProvider();
    const metrics = await provider.getMacroData();
    assert.equal(metrics.dataAvailable, true);
    assert.equal(metrics.interestRates.dataAvailable, true);
    assert.equal(metrics.vix.dataAvailable, false);
  } finally {
    fredSeriesProvider.fetchFredSeries = originalFetchFredSeries;
    marketProxyProvider.fetchMarketProxy = originalFetchMarketProxy;
  }
});

test("getMacroData: honestly reports dataAvailable: false only when every real source fails", async () => {
  const originalFetchFredSeries = fredSeriesProvider.fetchFredSeries;
  const originalFetchMarketProxy = marketProxyProvider.fetchMarketProxy;
  fredSeriesProvider.fetchFredSeries = async (seriesId) => fakeSeries(seriesId, false);
  marketProxyProvider.fetchMarketProxy = async (symbol) => fakeProxy(symbol, false);
  try {
    const provider = createMacroDataProvider();
    const metrics = await provider.getMacroData();
    assert.equal(metrics.dataAvailable, false);
    assert.match(metrics.unavailableReason, /No real macroeconomic data source/);
  } finally {
    fredSeriesProvider.fetchFredSeries = originalFetchFredSeries;
    marketProxyProvider.fetchMarketProxy = originalFetchMarketProxy;
  }
});
