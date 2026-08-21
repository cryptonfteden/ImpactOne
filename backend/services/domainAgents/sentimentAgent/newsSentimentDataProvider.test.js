require("../../../test/testEnv");
const test = require("node:test");
const assert = require("node:assert/strict");
const { createNewsSentimentDataProvider, emptyMetrics, isArticleRelevantToCompany } = require("./newsSentimentDataProvider");

test("company relevance rejects provider noise for an ambiguous ticker", () => {
  assert.equal(isArticleRelevantToCompany(
    { title: "Tesla and Palantir move after CPI", description: "Broader technology stocks advanced." },
    "NOW",
    "ServiceNow, Inc.",
  ), false);
  assert.equal(isArticleRelevantToCompany(
    { title: "ServiceNow expands its AI platform", description: "The company announced new tools." },
    "NOW",
    "ServiceNow, Inc.",
  ), true);
});

test("emptyMetrics honestly reports dataAvailable: false with the given reason, never fabricated articles", () => {
  const metrics = emptyMetrics("XYZ", "no key");
  assert.equal(metrics.symbol, "XYZ");
  assert.equal(metrics.dataAvailable, false);
  assert.equal(metrics.unavailableReason, "no key");
  assert.deepEqual(metrics.articles, []);
});

test("createNewsSentimentDataProvider: honestly reports unavailable when neither real news provider is configured", async () => {
  const envModule = require("../../../config/env");
  const originalNewsKey = envModule.NEWS_API_KEY;
  const originalFinnhubKey = envModule.FINNHUB_API_KEY;
  const originalGdelt = envModule.GDELT_NEWS_ENABLED;
  envModule.NEWS_API_KEY = "";
  envModule.FINNHUB_API_KEY = "";
  envModule.GDELT_NEWS_ENABLED = false;
  try {
    const provider = createNewsSentimentDataProvider();
    const metrics = await provider.getSymbolNews("AAPL");
    assert.equal(metrics.dataAvailable, false);
    assert.match(metrics.unavailableReason, /NEWS_API_KEY/);
    assert.match(metrics.unavailableReason, /FINNHUB_API_KEY/);
  } finally {
    envModule.NEWS_API_KEY = originalNewsKey;
    envModule.FINNHUB_API_KEY = originalFinnhubKey;
    envModule.GDELT_NEWS_ENABLED = originalGdelt;
  }
});

test("createNewsSentimentDataProvider: honestly reports unavailable on a real network failure, never fabricating a fallback article", async () => {
  const envModule = require("../../../config/env");
  const originalKey = envModule.NEWS_API_KEY;
  envModule.NEWS_API_KEY = "network-failure-key";
  const originalGet = require("axios").get;
  require("axios").get = () => Promise.reject(new Error("simulated network failure"));
  try {
    const provider = createNewsSentimentDataProvider({ identityResolver: async () => "Apple Inc" });
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
  envModule.NEWS_API_KEY = "zero-articles-key";
  const originalGet = require("axios").get;
  require("axios").get = () => Promise.resolve({ data: { articles: [] } });
  try {
    const provider = createNewsSentimentDataProvider({ identityResolver: async () => "Apple Inc" });
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
  envModule.NEWS_API_KEY = "mapped-articles-key";
  const originalGet = require("axios").get;
  let capturedQuery = null;
  require("axios").get = (_url, options) => {
    capturedQuery = options?.params?.q;
    return Promise.resolve({
      data: {
        articles: [
          { title: "Apple publishes a real update", description: "Real description", source: { name: "Reuters" }, publishedAt: "2026-01-01T00:00:00Z", url: "https://real" },
          { title: null, description: null, source: { name: "X" }, publishedAt: "2026-01-01T00:00:00Z" }, // no usable text — filtered out
        ],
      },
    });
  };
  try {
    const provider = createNewsSentimentDataProvider({ identityResolver: async () => "Apple Inc" });
    const metrics = await provider.getSymbolNews("AAPL");
    assert.equal(metrics.dataAvailable, true);
    assert.equal(metrics.articles.length, 1);
    assert.equal(metrics.articles[0].source, "Reuters");
    assert.equal(metrics.articles[0].title, "Apple publishes a real update");
    assert.equal(capturedQuery, '"Apple Inc"');
  } finally {
    require("axios").get = originalGet;
    envModule.NEWS_API_KEY = originalKey;
  }
});

test("createNewsSentimentDataProvider: uses real Finnhub company-news only after NewsAPI has no usable result", async () => {
  const envModule = require("../../../config/env");
  const originalNewsKey = envModule.NEWS_API_KEY;
  const originalFinnhubKey = envModule.FINNHUB_API_KEY;
  const originalGet = require("axios").get;
  envModule.NEWS_API_KEY = "test-news-key";
  envModule.FINNHUB_API_KEY = "test-finnhub-key";
  let calls = 0;
  require("axios").get = () => {
    calls += 1;
    if (calls === 1) return Promise.resolve({ data: { articles: [] } });
    return Promise.resolve({ data: [{ headline: "Verified company item", summary: "Reported detail", source: "Provider", datetime: 1760000000, url: "https://real.example" }] });
  };
  try {
    const provider = createNewsSentimentDataProvider({ identityResolver: async () => "Apple Inc" });
    const metrics = await provider.getSymbolNews("AAPL");
    assert.equal(metrics.dataAvailable, true);
    assert.equal(metrics.sourceProvider, "Finnhub company news");
    assert.equal(metrics.articles.length, 1);
    assert.equal(metrics.articles[0].title, "Verified company item");
    assert.match(metrics.primaryUnavailableReason, /NewsAPI returned zero real articles/);
  } finally {
    require("axios").get = originalGet;
    envModule.NEWS_API_KEY = originalNewsKey;
    envModule.FINNHUB_API_KEY = originalFinnhubKey;
  }
});

test("createNewsSentimentDataProvider uses GDELT only after keyed providers fail and a SEC identity is verified", async () => {
  const envModule = require("../../../config/env");
  const cikResolver = require("../insiderAgent/cikResolver");
  const original = { news: envModule.NEWS_API_KEY, finnhub: envModule.FINNHUB_API_KEY, gdelt: envModule.GDELT_NEWS_ENABLED, get: require("axios").get, resolve: cikResolver.resolveCik };
  envModule.NEWS_API_KEY = ""; envModule.FINNHUB_API_KEY = ""; envModule.GDELT_NEWS_ENABLED = true;
  cikResolver.resolveCik = async () => ({ cik: "0000320193", title: "Apple Inc" });
  require("axios").get = async (url) => {
    assert.match(url, /gdeltproject/);
    return { data: { articles: [{ title: "Verified indexed article", url: "https://publisher.example/item", domain: "publisher.example", seendate: "20260815123000" }] } };
  };
  try {
    const metrics = await createNewsSentimentDataProvider().getSymbolNews("AAPL");
    assert.equal(metrics.dataAvailable, true);
    assert.equal(metrics.sourceProvider, "GDELT 2.0");
    assert.equal(metrics.articles[0].source, "publisher.example");
  } finally {
    envModule.NEWS_API_KEY = original.news; envModule.FINNHUB_API_KEY = original.finnhub; envModule.GDELT_NEWS_ENABLED = original.gdelt;
    require("axios").get = original.get; cikResolver.resolveCik = original.resolve;
  }
});
