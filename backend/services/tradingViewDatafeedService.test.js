const test = require("node:test");
const assert = require("node:assert/strict");
const priceHistoryProvider = require("./intelligence/priceHistoryProvider");
const service = require("./tradingViewDatafeedService");

test("advertises only candle resolutions backed by the current verified provider paths", () => {
  assert.deepEqual(service.config().supported_resolutions, ["1", "5", "30", "1D", "1W"]);
  assert.equal(service.normalizeResolution("240"), null);
  assert.equal(service.normalizeResolution("1w"), "1W");
});

test("normalizes exchange-qualified TradingView symbols", () => {
  assert.equal(service.normalizeSymbol("NASDAQ:nvda"), "NVDA");
  assert.equal(service.normalizeSymbol("bad symbol"), null);
});

test("returns UDF OHLCV arrays with source and freshness metadata", async () => {
  const originalBars = priceHistoryProvider.getChartBars;
  const originalSource = priceHistoryProvider.getChartSource;
  priceHistoryProvider.getChartBars = async () => [
    { date: "2026-08-14T13:30:00.000Z", open: 100, high: 103, low: 99, close: 102, volume: 500 },
  ];
  priceHistoryProvider.getChartSource = () => ({ source: "Verified test source", sourceRole: "primary" });
  try {
    const result = await service.history({ symbol: "NYSE:NOW", resolution: "5", from: 0, to: 2000000000 });
    assert.equal(result.s, "ok");
    assert.deepEqual(result.o, [100]);
    assert.deepEqual(result.c, [102]);
    assert.equal(result.source, "Verified test source");
    assert.ok(result.retrievedAt);
  } finally {
    priceHistoryProvider.getChartBars = originalBars;
    priceHistoryProvider.getChartSource = originalSource;
  }
});

test("refuses unsupported resolutions instead of fabricating candles", async () => {
  const result = await service.history({ symbol: "NVDA", resolution: "240", from: 0, to: 2000000000 });
  assert.equal(result.s, "error");
  assert.match(result.errmsg, /will not synthesize/i);
});

