const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeImportance, analyzeSeverity } = require("./importanceAnalyzer");

test("analyzeSeverity: flags real severity-keyword articles", () => {
  const articles = [{ title: "Company files for bankruptcy", description: "" }, { title: "Quiet day for markets", description: "" }];
  const result = analyzeSeverity(articles);
  assert.equal(result.severityArticleCount, 1);
  assert.equal(result.severityScore, 50);
});

test("analyzeSeverity: honestly scores 0 with no real articles", () => {
  assert.deepEqual(analyzeSeverity([]), { severityScore: 0, severityArticleCount: 0 });
});

test("analyzeImportance: combines real freshness, confirmation, and severity via disclosed weights", () => {
  const articles = [{ title: "Company announces lawsuit", description: "" }];
  const result = analyzeImportance(100, 100, articles);
  assert.equal(result.importanceScore, Math.round(100 * 0.3 + 100 * 0.3 + 100 * 0.4));
});

test("analyzeImportance: scores 0 when every real upstream signal is 0", () => {
  const result = analyzeImportance(0, 0, []);
  assert.equal(result.importanceScore, 0);
});
