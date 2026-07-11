require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const newsService = require("./newsService");
const autonomousMarketService = require("./autonomousMarketService");

function article(title, url = "https://example.com/a") {
  return { title, description: "desc", url };
}

test("getRepresentativeEvents prioritizes live news headlines with their sourceUrl", () => {
  const result = autonomousMarketService.getRepresentativeEvents({
    scenarios: ["Oil spike"],
    watchlist: ["AAPL"],
    liveNews: [article("Fed signals pause on rate hikes", "https://news.example.com/fed-pause")],
  });

  const liveEntry = result.find((item) => item.headline === "Fed signals pause on rate hikes");
  assert.ok(liveEntry, "expected the live news headline to appear in the event list");
  assert.equal(liveEntry.sourceUrl, "https://news.example.com/fed-pause");
  assert.equal(result[0].headline, "Fed signals pause on rate hikes", "live news should be prioritized first");
});

test("getRepresentativeEvents backfills with the synthetic catalog when liveNews is empty", () => {
  const result = autonomousMarketService.getRepresentativeEvents({
    scenarios: ["Oil spike"],
    watchlist: ["AAPL"],
    liveNews: [],
  });

  assert.ok(result.length > 0);
  assert.ok(result.every((item) => item.sourceUrl === null), "synthetic entries carry no sourceUrl");
  assert.ok(result.some((item) => item.headline === "Oil spike"));
});

test("getRepresentativeEvents deduplicates a live headline that also exists in the synthetic catalog", () => {
  const result = autonomousMarketService.getRepresentativeEvents({
    scenarios: ["Oil spike"],
    watchlist: ["AAPL"],
    liveNews: [article("Oil spike", "https://news.example.com/oil")],
  });

  const matches = result.filter((item) => item.headline === "Oil spike");
  assert.equal(matches.length, 1, "the headline should appear once, carrying the live sourceUrl");
  assert.equal(matches[0].sourceUrl, "https://news.example.com/oil");
});

test("getRepresentativeEvents caps the total at 28 and live news at 6", () => {
  const manyArticles = Array.from({ length: 20 }, (_, index) => article(`Live headline ${index}`, `https://news.example.com/${index}`));
  const result = autonomousMarketService.getRepresentativeEvents({
    scenarios: [],
    watchlist: [],
    liveNews: manyArticles,
  });

  const liveCount = result.filter((item) => item.headline.startsWith("Live headline")).length;
  assert.equal(liveCount, 6);
  assert.ok(result.length <= 28);
});

test("getAutonomousOverview merges live news headlines into the feed with sourceUrl (no API keys configured — every other provider falls back gracefully)", async () => {
  const original = newsService.getNews;
  newsService.getNews = async () => [article("Live test headline for overview merge", "https://news.example.com/overview-merge")];

  try {
    const overview = await autonomousMarketService.getAutonomousOverview({ watchlist: ["OVMRG"] });
    const matched = overview.feed.find((item) => item.headline === "Live test headline for overview merge");
    assert.ok(matched, "expected the live news headline to flow through into the processed feed");
    assert.equal(matched.sourceUrl, "https://news.example.com/overview-merge");
  } finally {
    newsService.getNews = original;
  }
});

test("buildNewsQueryTerms prioritizes active-recommendation symbols, then held, then watchlist, then sectors", () => {
  const terms = autonomousMarketService.buildNewsQueryTerms({
    activeRecommendationSymbols: ["XOM"],
    heldSymbols: ["NVDA"],
    watchlistSymbols: ["PLTR"],
    sectors: ["Technology"],
  });

  assert.deepEqual(terms, ["XOM", "NVDA", "PLTR", "Technology sector stocks"]);
});

test("buildNewsQueryTerms dedupes a symbol appearing in multiple categories", () => {
  const terms = autonomousMarketService.buildNewsQueryTerms({
    activeRecommendationSymbols: ["NVDA"],
    heldSymbols: ["NVDA"],
    watchlistSymbols: ["PLTR"],
    sectors: [],
  });

  assert.deepEqual(terms, ["NVDA", "PLTR"]);
});

test("buildNewsQueryTerms caps the total number of terms", () => {
  const terms = autonomousMarketService.buildNewsQueryTerms({
    heldSymbols: ["A", "B", "C", "D", "E", "F", "G", "H"],
  });

  assert.equal(terms.length, 6);
});

test("getAutonomousOverview issues one news query per dynamic term when portfolioContext is provided", async () => {
  const original = newsService.getNews;
  const calledWith = [];
  newsService.getNews = async (query) => {
    calledWith.push(query);
    return [article(`Headline for ${query}`, `https://news.example.com/${encodeURIComponent(query)}`)];
  };

  try {
    const overview = await autonomousMarketService.getAutonomousOverview({
      watchlist: ["NVDA", "PLTR"],
      portfolioContext: { heldSymbols: ["NVDA"], watchlistSymbols: ["PLTR"], sectors: [], activeRecommendationSymbols: [] },
    });

    assert.deepEqual(calledWith, ["NVDA", "PLTR"]);
    assert.ok(overview.feed.some((item) => item.headline === "Headline for NVDA"));
    assert.ok(overview.feed.some((item) => item.headline === "Headline for PLTR"));
  } finally {
    newsService.getNews = original;
  }
});

test("getAutonomousOverview dedupes articles returned by more than one query term", async () => {
  const original = newsService.getNews;
  newsService.getNews = async () => [article("Shared headline", "https://news.example.com/shared")];

  try {
    const overview = await autonomousMarketService.getAutonomousOverview({
      watchlist: ["NVDA", "AMD"],
      portfolioContext: { heldSymbols: ["NVDA"], watchlistSymbols: ["AMD"], sectors: [], activeRecommendationSymbols: [] },
    });

    const matches = overview.feed.filter((item) => item.headline === "Shared headline");
    assert.equal(matches.length, 1, "the same article returned by two queries should only appear once");
  } finally {
    newsService.getNews = original;
  }
});

test("getAutonomousOverview without portfolioContext still issues a single 'markets' query (unchanged default behavior)", async () => {
  const original = newsService.getNews;
  const calledWith = [];
  newsService.getNews = async (query) => {
    calledWith.push(query);
    return [];
  };

  try {
    await autonomousMarketService.getAutonomousOverview({ watchlist: ["NODEFAULT"] });
    assert.deepEqual(calledWith, ["markets"]);
  } finally {
    newsService.getNews = original;
  }
});

test("getAutonomousOverview still works when the news provider fails", async () => {
  const original = newsService.getNews;
  newsService.getNews = async () => {
    throw new Error("news provider unavailable");
  };

  try {
    const overview = await autonomousMarketService.getAutonomousOverview({ watchlist: ["OVFAIL"] });
    assert.ok(overview.feed.length > 0, "should still produce a feed from the synthetic catalog");
  } finally {
    newsService.getNews = original;
  }
});
