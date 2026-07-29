const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeArticleRatio } = require("./articleRatioAnalyzer");

test("analyzeArticleRatio counts real classifications correctly", () => {
  const articles = [{ classification: "POSITIVE" }, { classification: "POSITIVE" }, { classification: "NEGATIVE" }, { classification: "NEUTRAL" }];
  const result = analyzeArticleRatio(articles);
  assert.equal(result.positiveCount, 2);
  assert.equal(result.negativeCount, 1);
  assert.equal(result.neutralCount, 1);
  assert.equal(result.ratio, 2);
});

test("analyzeArticleRatio honestly reports ratio: null (never Infinity or 0) with zero real negative articles", () => {
  const result = analyzeArticleRatio([{ classification: "POSITIVE" }]);
  assert.equal(result.ratio, null);
});

test("analyzeArticleRatio handles an empty real article set honestly", () => {
  const result = analyzeArticleRatio([]);
  assert.deepEqual(result, { positiveCount: 0, negativeCount: 0, neutralCount: 0, ratio: null });
});
