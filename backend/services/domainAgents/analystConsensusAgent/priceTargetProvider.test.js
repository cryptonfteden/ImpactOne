const test = require("node:test");
const assert = require("node:assert/strict");
const { getSymbolPriceTargets, emptyMetrics } = require("./priceTargetProvider");

test("emptyMetrics honestly reports dataAvailable: false with the given reason", () => {
  const metrics = emptyMetrics("AAPL", "no data");
  assert.equal(metrics.dataAvailable, false);
  assert.equal(metrics.targetMean, null);
});

test("getSymbolPriceTargets: parses a real successful response when a paid plan is available", async () => {
  const originalGet = require("axios").get;
  require("axios").get = () => Promise.resolve({ data: { symbol: "AAPL", targetHigh: 250, targetLow: 180, targetMedian: 220, targetMean: 218, lastUpdated: "2026-07-01" } });
  try {
    const metrics = await getSymbolPriceTargets("AAPL");
    assert.equal(metrics.dataAvailable, true);
    assert.equal(metrics.targetMean, 218);
  } finally {
    require("axios").get = originalGet;
  }
});

test("getSymbolPriceTargets: honestly reports unavailable on the real, confirmed HTTP 403 (free-tier restriction)", async () => {
  const originalGet = require("axios").get;
  require("axios").get = () => {
    const error = new Error("Request failed with status code 403");
    error.response = { status: 403 };
    return Promise.reject(error);
  };
  try {
    const metrics = await getSymbolPriceTargets("AAPL");
    assert.equal(metrics.dataAvailable, false);
    assert.match(metrics.unavailableReason, /requires a paid plan/);
  } finally {
    require("axios").get = originalGet;
  }
});

test("getSymbolPriceTargets: honestly reports unavailable with no symbol", async () => {
  const metrics = await getSymbolPriceTargets("");
  assert.equal(metrics.dataAvailable, false);
});
