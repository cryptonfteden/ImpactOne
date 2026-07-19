const test = require("node:test");
const assert = require("node:assert/strict");

const socialInfluenceService = require("./socialInfluenceService");

test("analyzePost derives every required field separately and marks isRecommendation false", () => {
  const post = {
    authorHandle: "@elonmusk",
    text: "I think production ramps faster than people expect.",
    publishedAt: "2026-07-18T16:30:00.000Z",
    entities: ["Tesla"],
    sectors: ["Technology"],
    sentiment: "POSITIVE",
    potentialMarketImpact: "MODERATE",
  };
  const result = socialInfluenceService.analyzePost(post);

  assert.equal(result.identity.handle, "@elonmusk");
  assert.equal(result.identity.onWatchlist, true);
  assert.equal(result.publicationTimestamp, post.publishedAt);
  assert.deepEqual(result.relevantEntities, ["Tesla"]);
  assert.equal(result.sentiment, "POSITIVE");
  assert.equal(result.opinion.length, 1);
  assert.equal(result.claimedFacts.length, 0);
  assert.equal(result.isRecommendation, false);
});

test("splitFactsFromOpinion separates hedged/opinion language from assertive claims", () => {
  assert.deepEqual(socialInfluenceService.splitFactsFromOpinion("I believe rates will fall."), { claimedFacts: [], opinion: ["I believe rates will fall."] });
  assert.deepEqual(socialInfluenceService.splitFactsFromOpinion("The CPI report showed 3.1% inflation."), { claimedFacts: ["The CPI report showed 3.1% inflation."], opinion: [] });
});

test("analyzePost never fabricates sentiment/impact/confidence for a post with no real text", () => {
  const result = socialInfluenceService.analyzePost({ authorHandle: "@elonmusk", text: "" });
  assert.equal(result.sentiment, null);
  assert.equal(result.potentialMarketImpact, null);
  assert.equal(result.confidence, 0);
  assert.equal(result.uncertainty, 100);
});

test("analyzePost honestly reports onWatchlist=false and no historical influence evidence for an unknown account", () => {
  const result = socialInfluenceService.analyzePost({ authorHandle: "@random_trader_99", text: "Buying the dip on everything today." });
  assert.equal(result.identity.onWatchlist, false);
  assert.equal(result.historicalInfluenceEvidence, null);
});

test("getFixtureFeed is clearly labeled FIXTURE and every post is still marked isRecommendation=false", () => {
  const feed = socialInfluenceService.getFixtureFeed();
  assert.equal(feed.status, "FIXTURE");
  assert.ok(feed.posts.length > 0);
  assert.ok(feed.posts.every((post) => post.isRecommendation === false));
});

test("getWatchlist covers all 6 mission-named categories", () => {
  const categories = new Set(socialInfluenceService.getWatchlist().map((entry) => entry.category));
  assert.ok(categories.has(socialInfluenceService.WATCHLIST_CATEGORIES.POLITICAL_FIGURE));
  assert.ok(categories.has(socialInfluenceService.WATCHLIST_CATEGORIES.CENTRAL_BANK_OFFICIAL));
  assert.ok(categories.has(socialInfluenceService.WATCHLIST_CATEGORIES.CONGRESS_MEMBER));
  assert.ok(categories.has(socialInfluenceService.WATCHLIST_CATEGORIES.COMPANY_EXECUTIVE));
  assert.ok(categories.has(socialInfluenceService.WATCHLIST_CATEGORIES.PROMINENT_INVESTOR));
});
