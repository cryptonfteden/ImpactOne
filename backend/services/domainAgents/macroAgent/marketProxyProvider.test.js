const test = require("node:test");
const assert = require("node:assert/strict");
const { fetchMarketProxy, emptyProxyMetrics } = require("./marketProxyProvider");
const priceHistoryProvider = require("../../intelligence/priceHistoryProvider");

test("emptyProxyMetrics honestly reports dataAvailable: false with the given reason", () => {
  const metrics = emptyProxyMetrics("^VIX", "no data");
  assert.equal(metrics.dataAvailable, false);
  assert.equal(metrics.unavailableReason, "no data");
  assert.equal(metrics.latestClose, null);
});

test("fetchMarketProxy: computes a real changePercent from real bars", async () => {
  const original = priceHistoryProvider.getDailyBars;
  priceHistoryProvider.getDailyBars = async () => [
    { date: "2026-06-01", close: 100 },
    { date: "2026-07-01", close: 120 },
  ];
  try {
    const metrics = await fetchMarketProxy("^VIX");
    assert.equal(metrics.dataAvailable, true);
    assert.equal(metrics.latestClose, 120);
    assert.equal(metrics.priorClose, 100);
    assert.equal(metrics.changePercent, 20);
  } finally {
    priceHistoryProvider.getDailyBars = original;
  }
});

test("fetchMarketProxy: honestly reports unavailable when no real bars are returned", async () => {
  const original = priceHistoryProvider.getDailyBars;
  priceHistoryProvider.getDailyBars = async () => [];
  try {
    const metrics = await fetchMarketProxy("^VIX");
    assert.equal(metrics.dataAvailable, false);
    assert.match(metrics.unavailableReason, /No real price history/);
  } finally {
    priceHistoryProvider.getDailyBars = original;
  }
});

test("fetchMarketProxy: honestly reports unavailable when real bars lack usable close values", async () => {
  const original = priceHistoryProvider.getDailyBars;
  priceHistoryProvider.getDailyBars = async () => [{ date: "2026-06-01", close: 0 }];
  try {
    const metrics = await fetchMarketProxy("^VIX");
    assert.equal(metrics.dataAvailable, false);
    assert.match(metrics.unavailableReason, /did not include usable close values/);
  } finally {
    priceHistoryProvider.getDailyBars = original;
  }
});
