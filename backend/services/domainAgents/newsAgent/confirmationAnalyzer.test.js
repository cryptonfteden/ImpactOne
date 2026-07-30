const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeConfirmation } = require("./confirmationAnalyzer");

test("scores high with many real distinct tier-1 sources", () => {
  const articles = [
    { source: "Reuters" }, { source: "Bloomberg" }, { source: "CNBC" }, { source: "MarketWatch" }, { source: "Forbes" },
  ];
  const result = analyzeConfirmation(articles);
  assert.equal(result.confirmationScore, 100);
  assert.equal(result.distinctSourceCount, 5);
});

test("scores low with a single real, non-tier-1 source", () => {
  const articles = [{ source: "Random Blog" }, { source: "Random Blog" }];
  const result = analyzeConfirmation(articles);
  assert.ok(result.confirmationScore < 50);
  assert.equal(result.distinctSourceCount, 1);
});

test("honestly scores 0 with no real articles", () => {
  const result = analyzeConfirmation([]);
  assert.equal(result.confirmationScore, 0);
});
