const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeNewsBiasScore } = require("./newsBiasScoreAnalyzer");

test("classifies BULLISH when real positive articles dominate", () => {
  const articles = [
    { title: "Company beats earnings expectations with record profit", description: "" },
    { title: "Company beats earnings expectations with record profit", description: "" },
    { title: "Neutral report", description: "" },
  ];
  const result = analyzeNewsBiasScore(articles);
  assert.equal(result.newsBias, "BULLISH");
});

test("classifies BEARISH when real negative articles dominate", () => {
  const articles = [
    { title: "Company misses earnings, faces lawsuit and losses", description: "" },
    { title: "Company misses earnings, faces lawsuit and losses", description: "" },
  ];
  const result = analyzeNewsBiasScore(articles);
  assert.equal(result.newsBias, "BEARISH");
});

test("honestly reports UNKNOWN with no real articles", () => {
  const result = analyzeNewsBiasScore([]);
  assert.equal(result.newsBias, "UNKNOWN");
  assert.equal(result.newsScore, null);
});
