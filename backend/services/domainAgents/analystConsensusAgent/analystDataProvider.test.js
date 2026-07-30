const test = require("node:test");
const assert = require("node:assert/strict");
const { createAnalystDataProvider } = require("./analystDataProvider");
const analystRecommendationProvider = require("./analystRecommendationProvider");
const priceTargetProvider = require("./priceTargetProvider");

test("getSymbolAnalystData: combines real recommendations and real (attempted) price targets", async () => {
  const originalRec = analystRecommendationProvider.getSymbolAnalystRecommendations;
  const originalPt = priceTargetProvider.getSymbolPriceTargets;
  analystRecommendationProvider.getSymbolAnalystRecommendations = async () => ({
    symbol: "AAPL",
    dataAvailable: true,
    unavailableReason: null,
    periods: [{ period: "2026-07-01", strongBuy: 10, buy: 10, hold: 5, sell: 1, strongSell: 0 }],
  });
  priceTargetProvider.getSymbolPriceTargets = async () => ({ symbol: "AAPL", dataAvailable: false, unavailableReason: "403", targetHigh: null, targetLow: null, targetMedian: null, targetMean: null, lastUpdated: null });
  try {
    const provider = createAnalystDataProvider();
    const metrics = await provider.getSymbolAnalystData("AAPL");
    assert.equal(metrics.dataAvailable, true);
    assert.equal(metrics.periods.length, 1);
    assert.equal(metrics.priceTargets.dataAvailable, false);
  } finally {
    analystRecommendationProvider.getSymbolAnalystRecommendations = originalRec;
    priceTargetProvider.getSymbolPriceTargets = originalPt;
  }
});

test("getSymbolAnalystData: honestly reports unavailable when the real recommendation source fails, regardless of price targets", async () => {
  const originalRec = analystRecommendationProvider.getSymbolAnalystRecommendations;
  const originalPt = priceTargetProvider.getSymbolPriceTargets;
  analystRecommendationProvider.getSymbolAnalystRecommendations = async () => ({ symbol: "AAPL", dataAvailable: false, unavailableReason: "no key", periods: [] });
  priceTargetProvider.getSymbolPriceTargets = async () => ({ symbol: "AAPL", dataAvailable: true, unavailableReason: null, targetHigh: 1, targetLow: 1, targetMedian: 1, targetMean: 1, lastUpdated: "x" });
  try {
    const provider = createAnalystDataProvider();
    const metrics = await provider.getSymbolAnalystData("AAPL");
    assert.equal(metrics.dataAvailable, false);
    assert.match(metrics.unavailableReason, /no key/);
  } finally {
    analystRecommendationProvider.getSymbolAnalystRecommendations = originalRec;
    priceTargetProvider.getSymbolPriceTargets = originalPt;
  }
});
