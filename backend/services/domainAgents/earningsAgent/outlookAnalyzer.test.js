const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeOutlook } = require("./outlookAnalyzer");
const { emptyMetrics } = require("./earningsDataProvider");

test("with zero real signals available, outlook is honestly UNKNOWN with zero confidence contribution", () => {
  const metrics = emptyMetrics("NVDA", "not connected");
  const result = analyzeOutlook({ growth: { growthScore: null }, surprise: { surpriseScore: null }, metrics });
  assert.equal(result.outlook, "UNKNOWN");
  assert.equal(result.confidenceContribution, 0);
});

test("strong historical growth and surprises alone do not become a forward forecast", () => {
  const metrics = emptyMetrics("NVDA", null);
  metrics.dataAvailable = true;
  const result = analyzeOutlook({ growth: { growthScore: 90 }, surprise: { surpriseScore: 85 }, metrics });
  assert.equal(result.outlook, "UNKNOWN");
  assert.equal(result.confidenceContribution, 0);
  assert.equal(result.contributions.historicalGrowth, 90);
});

test("weak historical growth and surprises alone do not become a forward forecast", () => {
  const metrics = emptyMetrics("NVDA", null);
  metrics.dataAvailable = true;
  const result = analyzeOutlook({ growth: { growthScore: 10 }, surprise: { surpriseScore: 15 }, metrics });
  assert.equal(result.outlook, "UNKNOWN");
});

test("historical midpoint scores remain context only without forward evidence", () => {
  const metrics = emptyMetrics("NVDA", null);
  metrics.dataAvailable = true;
  const result = analyzeOutlook({ growth: { growthScore: 52 }, surprise: { surpriseScore: 50 }, metrics });
  assert.equal(result.outlook, "UNKNOWN");
});

test("a real RAISED guidance direction contributes positively when present", () => {
  const metrics = emptyMetrics("NVDA", null);
  metrics.dataAvailable = true;
  metrics.guidance.direction = "RAISED";
  const result = analyzeOutlook({ growth: { growthScore: null }, surprise: { surpriseScore: null }, metrics });
  assert.equal(result.outlook, "POSITIVE");
  assert.equal(result.contributions.guidance, 100);
});

test("a real LOWERED guidance direction contributes negatively when present", () => {
  const metrics = emptyMetrics("NVDA", null);
  metrics.dataAvailable = true;
  metrics.guidance.direction = "LOWERED";
  const result = analyzeOutlook({ growth: { growthScore: null }, surprise: { surpriseScore: null }, metrics });
  assert.equal(result.outlook, "NEGATIVE");
});

test("a real UP analyst-revision direction contributes positively when present", () => {
  const metrics = emptyMetrics("NVDA", null);
  metrics.dataAvailable = true;
  metrics.analystRevisions.direction = "UP";
  const result = analyzeOutlook({ growth: { growthScore: null }, surprise: { surpriseScore: null }, metrics });
  assert.equal(result.outlook, "POSITIVE");
});

test("confidenceContribution reaches 100 when both forward evidence categories are present", () => {
  const metrics = emptyMetrics("NVDA", null);
  metrics.dataAvailable = true;
  metrics.guidance.direction = "MAINTAINED";
  metrics.analystRevisions.direction = "MIXED";
  const result = analyzeOutlook({ growth: { growthScore: 60 }, surprise: { surpriseScore: 60 }, metrics });
  assert.equal(result.confidenceContribution, 100);
});
