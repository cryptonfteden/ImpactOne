const test = require("node:test");
const assert = require("node:assert/strict");
const { scoreArticle, scoreArticles } = require("./articleSentimentScorer");

test("scoreArticle classifies a real positive-worded article as POSITIVE", () => {
  const result = scoreArticle({ title: "Company beats earnings, stock surges", description: "Record growth reported." });
  assert.equal(result.classification, "POSITIVE");
  assert.ok(result.positiveHits > result.negativeHits);
});

test("scoreArticle classifies a real negative-worded article as NEGATIVE", () => {
  const result = scoreArticle({ title: "Stock plunges amid fraud investigation", description: "Lawsuit filed after scandal." });
  assert.equal(result.classification, "NEGATIVE");
  assert.ok(result.negativeHits > result.positiveHits);
});

test("scoreArticle classifies an article with no real sentiment-bearing words as NEUTRAL", () => {
  const result = scoreArticle({ title: "Company holds annual shareholder meeting", description: "Executives discuss quarterly agenda." });
  assert.equal(result.classification, "NEUTRAL");
});

test("scoreArticle classifies an equal real hit count as NEUTRAL, never arbitrarily picking a side", () => {
  const result = scoreArticle({ title: "Stock gains despite a real loss reported elsewhere", description: "" });
  assert.equal(result.positiveHits, result.negativeHits);
  assert.equal(result.classification, "NEUTRAL");
});

test("scoreArticle handles a missing description gracefully", () => {
  const result = scoreArticle({ title: "Company beats expectations", description: null });
  assert.equal(result.classification, "POSITIVE");
});

test("scoreArticles preserves every original field and merges in the real scoring fields, in order", () => {
  const articles = [
    { title: "Beats expectations", description: null, source: "Reuters", publishedAt: "2026-01-01T00:00:00Z", url: "https://x" },
  ];
  const scored = scoreArticles(articles);
  assert.equal(scored.length, 1);
  assert.equal(scored[0].source, "Reuters");
  assert.equal(scored[0].classification, "POSITIVE");
});
