const test = require("node:test");
const assert = require("node:assert/strict");
const { createSentimentDataProvider } = require("./sentimentDataProvider");

function fakeNewsProvider(metrics) {
  return { getSymbolNews: async () => metrics };
}
function fakeSocialProvider(metrics) {
  return { getSymbolSocialSentiment: async () => metrics };
}

test("createSentimentDataProvider: honestly propagates news unavailability, never fabricating articles", async () => {
  const provider = createSentimentDataProvider({
    newsProvider: fakeNewsProvider({ symbol: "AAPL", dataAvailable: false, unavailableReason: "no key", articles: [] }),
    socialProvider: fakeSocialProvider({ symbol: "AAPL", dataAvailable: false, unavailableReason: "stub", posts: [] }),
  });
  const metrics = await provider.getSymbolSentimentData("AAPL");
  assert.equal(metrics.dataAvailable, false);
  assert.equal(metrics.unavailableReason, "no key");
  assert.deepEqual(metrics.articles, []);
  assert.equal(metrics.socialAvailable, false);
});

test("createSentimentDataProvider: scores real articles and reports real social unavailability alongside them", async () => {
  const originalModule = require("../../intelligence/priceHistoryProvider");
  const original = originalModule.getDailyBars;
  originalModule.getDailyBars = async () => [
    { date: "2026-01-01", open: 100, high: 101, low: 99, close: 100, volume: 1000 },
    { date: "2026-01-02", open: 100, high: 102, low: 99, close: 101, volume: 1000 },
  ];
  try {
    const provider = createSentimentDataProvider({
      newsProvider: fakeNewsProvider({
        symbol: "AAPL",
        dataAvailable: true,
        unavailableReason: null,
        sourceProvider: "NewsAPI",
        queryIdentity: "Apple Inc",
        articles: [{ title: "Company beats expectations", description: null, source: "Reuters", publishedAt: "2026-01-01T00:00:00Z", url: "https://x" }],
      }),
      socialProvider: fakeSocialProvider({ symbol: "AAPL", dataAvailable: false, unavailableReason: "no real social source", posts: [] }),
    });
    const metrics = await provider.getSymbolSentimentData("AAPL");
    assert.equal(metrics.dataAvailable, true);
    assert.equal(metrics.articles.length, 1);
    assert.equal(metrics.articles[0].classification, "POSITIVE");
    assert.equal(metrics.socialAvailable, false);
    assert.equal(metrics.socialUnavailableReason, "no real social source");
    assert.equal(metrics.queryIdentity, "Apple Inc");
    assert.ok(Array.isArray(metrics.priceBars));
  } finally {
    originalModule.getDailyBars = original;
  }
});
