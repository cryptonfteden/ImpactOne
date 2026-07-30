const test = require("node:test");
const assert = require("node:assert/strict");
const { getSymbolAnalystRecommendations, emptyMetrics } = require("./analystRecommendationProvider");

test("emptyMetrics honestly reports dataAvailable: false with the given reason, never fabricated periods", () => {
  const metrics = emptyMetrics("AAPL", "no data");
  assert.equal(metrics.dataAvailable, false);
  assert.equal(metrics.unavailableReason, "no data");
  assert.deepEqual(metrics.periods, []);
});

test("getSymbolAnalystRecommendations: honestly reports unavailable with no symbol", async () => {
  const metrics = await getSymbolAnalystRecommendations("");
  assert.equal(metrics.dataAvailable, false);
});

test("getSymbolAnalystRecommendations: parses a real successful response, sorted oldest-first", async () => {
  const originalGet = require("axios").get;
  require("axios").get = () =>
    Promise.resolve({
      data: [
        { symbol: "AAPL", period: "2026-06-01", strongBuy: 14, buy: 24, hold: 15, sell: 2, strongSell: 0 },
        { symbol: "AAPL", period: "2026-07-01", strongBuy: 13, buy: 23, hold: 16, sell: 2, strongSell: 0 },
      ],
    });
  try {
    const metrics = await getSymbolAnalystRecommendations("AAPL");
    assert.equal(metrics.dataAvailable, true);
    assert.equal(metrics.periods.length, 2);
    assert.equal(metrics.periods[0].period, "2026-06-01");
    assert.equal(metrics.periods[1].period, "2026-07-01");
  } finally {
    require("axios").get = originalGet;
  }
});

test("getSymbolAnalystRecommendations: honestly reports unavailable on a real 403 (paid-plan-only response)", async () => {
  const originalGet = require("axios").get;
  require("axios").get = () => {
    const error = new Error("Request failed with status code 403");
    error.response = { status: 403 };
    return Promise.reject(error);
  };
  try {
    const metrics = await getSymbolAnalystRecommendations("AAPL");
    assert.equal(metrics.dataAvailable, false);
    assert.match(metrics.unavailableReason, /Finnhub rejected/);
  } finally {
    require("axios").get = originalGet;
  }
});

test("getSymbolAnalystRecommendations: honestly reports unavailable when Finnhub returns an empty real array", async () => {
  const originalGet = require("axios").get;
  require("axios").get = () => Promise.resolve({ data: [] });
  try {
    const metrics = await getSymbolAnalystRecommendations("NOPE");
    assert.equal(metrics.dataAvailable, false);
    assert.match(metrics.unavailableReason, /no real analyst recommendation data/);
  } finally {
    require("axios").get = originalGet;
  }
});
