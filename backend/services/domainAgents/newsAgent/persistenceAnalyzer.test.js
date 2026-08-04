const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzePersistence } = require("./persistenceAnalyzer");

test("classifies SINGLE_DAY when all real articles share one real day", () => {
  const articles = [{ publishedAt: "2026-07-30T01:00:00Z" }, { publishedAt: "2026-07-30T10:00:00Z" }];
  assert.equal(analyzePersistence(articles).persistenceClassification, "SINGLE_DAY");
});

test("classifies MULTI_DAY when real articles span 2-4 real days", () => {
  const articles = [{ publishedAt: "2026-07-28T00:00:00Z" }, { publishedAt: "2026-07-29T00:00:00Z" }, { publishedAt: "2026-07-30T00:00:00Z" }];
  assert.equal(analyzePersistence(articles).persistenceClassification, "MULTI_DAY");
  assert.equal(analyzePersistence(articles).distinctDayCount, 3);
});

test("classifies SUSTAINED when real articles span 5+ real days", () => {
  const articles = ["2026-07-26", "2026-07-27", "2026-07-28", "2026-07-29", "2026-07-30"].map((d) => ({ publishedAt: `${d}T00:00:00Z` }));
  assert.equal(analyzePersistence(articles).persistenceClassification, "SUSTAINED");
});

test("honestly reports UNKNOWN with no real articles", () => {
  assert.equal(analyzePersistence([]).persistenceClassification, "UNKNOWN");
});
