require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const newsService = require("./newsService");
const autonomousMarketService = require("./autonomousMarketService");

function article(title, url = "https://example.com/a", sourceName = null) {
  return { title, description: "desc", url, source: sourceName ? { name: sourceName } : undefined };
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

test("canonical provider events retain their saved evidence when projected into the Daily Feed", () => {
  const item = autonomousMarketService.mapCanonicalEventToFeedItem({
    id: "event-1",
    eventType: "fomc-communication",
    summary: "Federal Reserve issues FOMC statement",
    sourceName: "Federal Reserve — FOMC",
    sourceUrl: "https://example.com/fomc",
    publishedAt: new Date("2026-08-07T12:00:00Z"),
    symbols: ["SPY"],
    sectors: ["Financial Services"],
    countries: ["US"],
    credibilityScore: 100,
    freshnessScore: 90,
    confidence: 90,
  }, ["SPY"]);

  assert.equal(item.headline, "Federal Reserve issues FOMC statement");
  assert.deepEqual(item.relatedTickers, ["SPY"]);
  assert.equal(item.sourceEventType, "fomc-communication");
  assert.match(item.explainability.reasoning, /no additional causal analysis/);
});

test("Daily Feed merge removes an exact duplicate source URL while preserving provider-only events", () => {
  const merged = autonomousMarketService.mergeFeedItems(
    [{ headline: "News", sourceName: "News", sourceUrl: "https://example.com/same", importanceScore: 60 }],
    [
      { headline: "Same event", sourceName: "Provider", sourceUrl: "https://example.com/same", importanceScore: 90 },
      { headline: "Provider only", sourceName: "Provider", sourceUrl: "https://example.com/unique", importanceScore: 80 },
    ]
  );
  assert.equal(merged.length, 2);
  assert.equal(merged[0].headline, "Provider only");
});

test("getRepresentativeEvents carries the article's source name alongside its sourceUrl", () => {
  const result = autonomousMarketService.getRepresentativeEvents({
    scenarios: [],
    watchlist: [],
    liveNews: [article("Fed signals pause on rate hikes", "https://news.example.com/fed-pause", "Reuters")],
  });

  const liveEntry = result.find((item) => item.headline === "Fed signals pause on rate hikes");
  assert.equal(liveEntry.sourceName, "Reuters");

  const synthetic = result.find((item) => item.sourceUrl === null);
  assert.equal(synthetic.sourceName, null, "synthetic entries carry no sourceName either");
});

test("getRepresentativeEvents carries the article's publishedAt timestamp (Sprint 16 Phase D)", () => {
  const publishedAt = "2026-07-11T10:00:00.000Z";
  const result = autonomousMarketService.getRepresentativeEvents({
    scenarios: [],
    watchlist: [],
    liveNews: [{ title: "Fed signals pause on rate hikes", url: "https://news.example.com/fed-pause", publishedAt }],
  });

  const liveEntry = result.find((item) => item.headline === "Fed signals pause on rate hikes");
  assert.equal(liveEntry.publishedAt, publishedAt);

  const synthetic = result.find((item) => item.sourceUrl === null);
  assert.equal(synthetic.publishedAt, null, "synthetic entries carry no publishedAt either");
});

test("Sprint 25 — watchlistRankings' fallback explanation (no matched event) is genuinely derived per symbol, not identical boilerplate", async () => {
  const original = newsService.getNews;
  newsService.getNews = async () => [];

  try {
    const overview = await autonomousMarketService.getAutonomousOverview({ watchlist: ["ZZZQ1", "ZZZQ2"] });
    const rankings = overview.watchlistRankings.filter((item) => ["ZZZQ1", "ZZZQ2"].includes(item.symbol));
    assert.equal(rankings.length, 2);

    for (const item of rankings) {
      assert.doesNotMatch(item.explanation, /is being scored on macro, event, and positioning exposure\.$/, "must not fall back to the old generic boilerplate sentence");
      assert.match(item.explanation, new RegExp(`^${item.symbol}:`), "fallback explanation must be scoped to this specific symbol");
      assert.match(item.explanation, /score of \d+\/100/, "fallback must cite this symbol's own real computed score, not a fixed sentence");
    }
  } finally {
    newsService.getNews = original;
  }
});

test("Sprint 26 — Trust Breaker fix: portfolioImpactPrediction never claims overlap for a watchlist with no real match", async () => {
  const original = newsService.getNews;
  newsService.getNews = async () => [];

  try {
    // ZZZQ1 never appears in any generic asset-template fallback list
    // (AAPL/NVDA/TSLA/MSFT/BTC/ETH/etc.), so any feed item claiming
    // portfolio overlap here would prove the old bug (falling back to the
    // generic template list) is still present.
    const overview = await autonomousMarketService.getAutonomousOverview({ watchlist: ["ZZZQ1"] });
    assert.ok(overview.feed.length > 0, "expected at least one feed item to check");

    for (const item of overview.feed) {
      // ZZZQ1 is watched but never appears in this event's affected assets
      // (it's not a real symbol any template branch would produce), so
      // relatedTickers must be empty and the claim must be honest.
      assert.deepEqual(item.relatedTickers, [], `${item.headline}: relatedTickers must be empty when nothing genuinely matches`);
      assert.equal(item.portfolioImpactPrediction, "No direct portfolio overlap detected.");
    }
  } finally {
    newsService.getNews = original;
  }
});

test("getAutonomousOverview threads publishedAt through into the processed feed", async () => {
  const original = newsService.getNews;
  const publishedAt = "2026-07-11T10:00:00.000Z";
  newsService.getNews = async () => [{ title: "Live headline with a timestamp", url: "https://news.example.com/timestamped", publishedAt }];

  try {
    const overview = await autonomousMarketService.getAutonomousOverview({ watchlist: ["OVPUB"] });
    const matched = overview.feed.find((item) => item.headline === "Live headline with a timestamp");
    assert.ok(matched);
    assert.equal(matched.publishedAt, publishedAt);
  } finally {
    newsService.getNews = original;
  }
});

test("Sprint 16 Phase D exports sourceQualityScore, recencyScore, buildInvalidation, buildCounterarguments, and classifyEventType for reuse", () => {
  assert.equal(typeof autonomousMarketService.sourceQualityScore, "function");
  assert.equal(typeof autonomousMarketService.recencyScore, "function");
  assert.equal(typeof autonomousMarketService.buildInvalidation, "function");
  assert.equal(typeof autonomousMarketService.buildCounterarguments, "function");
  assert.equal(typeof autonomousMarketService.classifyEventType, "function");

  assert.equal(autonomousMarketService.sourceQualityScore("Reuters"), 95);
  assert.equal(autonomousMarketService.sourceQualityScore("Some Random Blog"), 60);
  assert.ok(Array.isArray(autonomousMarketService.buildInvalidation("energy")));
  assert.ok(Array.isArray(autonomousMarketService.buildCounterarguments("earnings", "Company beats earnings")));
  assert.equal(autonomousMarketService.classifyEventType("Fed rate hike"), "centralBanks");
});

test("Sprint 27 — buildInvalidation gives distinct event types their own signals, not one shared generic fallback", () => {
  const types = ["defense", "ai", "healthcare", "consumer", "financials", "space", "nuclear", "cybersecurity", "quantum", "geopolitics", "ma", "regulation", "supplyChain", "semiconductors", "macro"];
  const results = types.map((type) => autonomousMarketService.buildInvalidation(type).join("|"));
  const uniqueResults = new Set(results);
  assert.equal(uniqueResults.size, types.length, "every event type should have its own invalidation signals, not a shared fallback");
});

test("Sprint 27 — buildCounterarguments gives distinct event types their own leading counterargument", () => {
  const types = ["defense", "ai", "healthcare", "consumer", "financials", "space", "nuclear", "cybersecurity", "quantum"];
  const firstLines = types.map((type) => autonomousMarketService.buildCounterarguments(type, "Event headline")[0]);
  const uniqueFirstLines = new Set(firstLines);
  assert.equal(uniqueFirstLines.size, types.length, "every event type should lead with its own counterargument");
});

// Phase RC1-BLOCKERS-001 — the founder-week live review found 3 of 4 active
// recommendations (GOOGL/NVDA/MSFT, all classified "ai") sharing byte-
// identical "Would prove it wrong" and invalidation-signal text, since both
// builders were keyed only by the coarse event-type category, never by the
// specific matched headline. Fixed by interpolating the real, already-known
// headline into the leading line of each — genuine per-event evidence, not
// invented variation.
test("RC1-BLOCKERS-001 — buildCounterarguments differentiates two same-category events by their real, specific headline", () => {
  const nvda = autonomousMarketService.buildCounterarguments("ai", "NVDA AI demand acceleration");
  const googl = autonomousMarketService.buildCounterarguments("ai", "AI capex supercycle");

  assert.notEqual(nvda[0], googl[0], "two different headlines in the same category must not share an identical leading counterargument");
  assert.match(nvda[0], /NVDA AI demand acceleration/, "the leading counterargument must cite this call's own real headline");
});

test("RC1-BLOCKERS-001 — buildInvalidation differentiates two same-category events by their real, specific headline", () => {
  const nvda = autonomousMarketService.buildInvalidation("ai", "NVDA AI demand acceleration");
  const googl = autonomousMarketService.buildInvalidation("ai", "AI capex supercycle");

  assert.notEqual(nvda[0], googl[0], "two different headlines in the same category must not share an identical leading invalidation signal");
  assert.match(nvda[0], /NVDA AI demand acceleration/, "the leading invalidation signal must cite this call's own real headline");
});

test("RC1-BLOCKERS-001 — two genuinely identical headlines still produce identical counterarguments/invalidation (no artificial variation)", () => {
  const first = autonomousMarketService.buildCounterarguments("ai", "NVDA AI demand acceleration");
  const second = autonomousMarketService.buildCounterarguments("ai", "NVDA AI demand acceleration");
  assert.deepEqual(first, second, "the exact same headline must deterministically produce the exact same counterarguments");
});

test("RC1-BLOCKERS-001 — classifyEventType uses real word-boundary matching, not a substring false positive", () => {
  // "said" contains "ai"; this headline is genuinely about Fed policy, not AI.
  assert.equal(autonomousMarketService.classifyEventType("Fed chair said rates may hold steady"), "centralBanks");
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

test("getAutonomousOverview merges live news headlines into the feed with sourceUrl and sourceName (no API keys configured — every other provider falls back gracefully)", async () => {
  const original = newsService.getNews;
  newsService.getNews = async () => [article("Live test headline for overview merge", "https://news.example.com/overview-merge", "Bloomberg")];

  try {
    const overview = await autonomousMarketService.getAutonomousOverview({ watchlist: ["OVMRG"] });
    const matched = overview.feed.find((item) => item.headline === "Live test headline for overview merge");
    assert.ok(matched, "expected the live news headline to flow through into the processed feed");
    assert.equal(matched.sourceUrl, "https://news.example.com/overview-merge");
    assert.equal(matched.sourceName, "Bloomberg");
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

test("rankNewsArticles ranks a higher-priority query term above a lower one, all else equal", () => {
  const now = new Date().toISOString();
  const ranked = autonomousMarketService.rankNewsArticles([
    { article: { title: "Sector-level story", url: "https://e.com/1", publishedAt: now, source: { name: "Reuters" } }, termIndex: 3 },
    { article: { title: "Held-symbol story", url: "https://e.com/2", publishedAt: now, source: { name: "Reuters" } }, termIndex: 0 },
  ]);

  assert.equal(ranked[0].title, "Held-symbol story");
});

test("rankNewsArticles ranks a higher-quality source above a lower one, all else equal", () => {
  const now = new Date().toISOString();
  const ranked = autonomousMarketService.rankNewsArticles([
    { article: { title: "Unknown blog story", url: "https://e.com/1", publishedAt: now, source: { name: "Random Blog" } }, termIndex: 0 },
    { article: { title: "Reuters story", url: "https://e.com/2", publishedAt: now, source: { name: "Reuters" } }, termIndex: 0 },
  ]);

  assert.equal(ranked[0].title, "Reuters story");
});

test("rankNewsArticles ranks a more recent article above an older one, all else equal", () => {
  const now = new Date().toISOString();
  const lastWeek = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
  const ranked = autonomousMarketService.rankNewsArticles([
    { article: { title: "Old story", url: "https://e.com/1", publishedAt: lastWeek, source: { name: "Reuters" } }, termIndex: 0 },
    { article: { title: "Fresh story", url: "https://e.com/2", publishedAt: now, source: { name: "Reuters" } }, termIndex: 0 },
  ]);

  assert.equal(ranked[0].title, "Fresh story");
});

test("rankNewsArticles doesn't crash on an article with no source or publishedAt (fallback article shape)", () => {
  const ranked = autonomousMarketService.rankNewsArticles([
    { article: { title: "Fallback article", url: "https://example.com/news/1" }, termIndex: 0 },
  ]);

  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].title, "Fallback article");
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
