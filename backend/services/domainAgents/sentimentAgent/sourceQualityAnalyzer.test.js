const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeSourceQuality, TIER1_SOURCES } = require("./sourceQualityAnalyzer");

test("analyzeSourceQuality counts real distinct sources", () => {
  const articles = [{ source: "Reuters" }, { source: "Reuters" }, { source: "Random Blog" }];
  const result = analyzeSourceQuality(articles);
  assert.equal(result.distinctSourceCount, 2);
  assert.deepEqual(result.sources.sort(), ["Random Blog", "Reuters"]);
});

test("analyzeSourceQuality computes a real credibilityScore from the real tier-1 outlet ratio", () => {
  const articles = [{ source: "Reuters" }, { source: "Bloomberg" }, { source: "Random Blog" }, { source: "Random Blog" }];
  const result = analyzeSourceQuality(articles);
  assert.equal(result.tier1ArticleCount, 2);
  assert.equal(result.totalArticleCount, 4);
  assert.equal(result.credibilityScore, 50);
});

test("analyzeSourceQuality: every TIER1_SOURCES entry, when used alone, produces a real credibilityScore of 100", () => {
  for (const source of TIER1_SOURCES) {
    const result = analyzeSourceQuality([{ source }]);
    assert.equal(result.credibilityScore, 100, `${source} should be a real tier-1 source`);
  }
});

test("analyzeSourceQuality honestly reports 0 for an empty real article set, never a fabricated score", () => {
  const result = analyzeSourceQuality([]);
  assert.equal(result.credibilityScore, 0);
  assert.equal(result.distinctSourceCount, 0);
});
