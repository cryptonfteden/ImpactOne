require("../../../test/testEnv");
const test = require("node:test");
const assert = require("node:assert/strict");
const { createNewsSentimentDataProvider, emptyMetrics } = require("./newsSentimentDataProvider");

test("emptyMetrics honestly reports dataAvailable: false with the given reason, never fabricated articles", () => {
  const metrics = emptyMetrics("XYZ", "no key");
  assert.equal(metrics.symbol, "XYZ");
  assert.equal(metrics.dataAvailable, false);
  assert.equal(metrics.unavailableReason, "no key");
  assert.deepEqual(metrics.articles, []);
});

test("createNewsSentimentDataProvider: honestly reports unavailable when no NEWS_API_KEY is configured (this test environment's real state)", async () => {
  const provider = createNewsSentimentDataProvider();
  const metrics = await provider.getSymbolNews("AAPL");
  assert.equal(metrics.dataAvailable, false);
  assert.match(metrics.unavailableReason, /NEWS_API_KEY/);
});

test("createNewsSentimentDataProvider: honestly reports unavailable on a real network failure, never fabricating a fallback article", async () => {
  const envModule = require("../../../config/env");
  const originalKey = envModule.NEWS_API_KEY;
  envModule.NEWS_API_KEY = "test-key";
  const originalGet = require("axios").get;
  require("axios").get = () => Promise.reject(new Error("simulated network failure"));
  try {
    const provider = createNewsSentimentDataProvider();
    const metrics = await provider.getSymbolNews("AAPL");
    assert.equal(metrics.dataAvailable, false);
    assert.match(metrics.unavailableReason, /simulated network failure/);
  } finally {
    require("axios").get = originalGet;
    envModule.NEWS_API_KEY = originalKey;
  }
});

test("createNewsSentimentDataProvider: honestly reports unavailable when NewsAPI returns zero real articles", async () => {
  const envModule = require("../../../config/env");
  const originalKey = envModule.NEWS_API_KEY;
  envModule.NEWS_API_KEY = "test-key";
  const originalGet = require("axios").get;
  require("axios").get = () => Promise.resolve({ data: { articles: [] } });
  try {
    const provider = createNewsSentimentDataProvider();
    const metrics = await provider.getSymbolNews("AAPL");
    assert.equal(metrics.dataAvailable, false);
    assert.match(metrics.unavailableReason, /zero real articles/);
  } finally {
    require("axios").get = originalGet;
    envModule.NEWS_API_KEY = originalKey;
  }
});

test("createNewsSentimentDataProvider: maps real NewsAPI articles into the documented shape", async () => {
  const envModule = require("../../../config/env");
  const originalKey = envModule.NEWS_API_KEY;
  envModule.NEWS_API_KEY = "test-key";
  const originalGet = require("axios").get;
  require("axios").get = () =>
    Promise.resolve({
      data: {
        articles: [
          { title: "Real headline", description: "Real description", source: { name: "Reuters" }, publishedAt: "2026-01-01T00:00:00Z", url: "https://real" },
          { title: null, description: null, source: { name: "X" }, publishedAt: "2026-01-01T00:00:00Z" }, // no usable text — filtered out
        ],
      },
    });
  try {
    const provider = createNewsSentimentDataProvider();
    const metrics = await provider.getSymbolNews("AAPL");
    assert.equal(metrics.dataAvailable, true);
    assert.equal(metrics.articles.length, 1);
    assert.equal(metrics.articles[0].source, "Reuters");
    assert.equal(metrics.articles[0].title, "Real headline");
  } finally {
    require("axios").get = originalGet;
    envModule.NEWS_API_KEY = originalKey;
  }
});
