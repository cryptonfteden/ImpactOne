require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const explainabilityInsightsService = require("./explainabilityInsightsService");
const analyticsService = require("./analyticsService");

test.beforeEach(async () => {
  await truncateAll();
});

test("returns an honest, empty state with no real interactions yet", async () => {
  const insights = await explainabilityInsightsService.getExplainabilityInsights();
  assert.equal(insights.recommendationsShown, 0);
  assert.equal(insights.expandRate, null);
  assert.equal(insights.avgReadingTimeMs, null);
  assert.equal(insights.insights.length, 1);
});

test("computes a real expand rate and reading time from real events", async () => {
  await analyticsService.recordEvent({ eventName: "recommendation_viewed", betaUserId: "beta-1", properties: { symbol: "NVDA" } });
  await analyticsService.recordEvent({ eventName: "recommendation_viewed", betaUserId: "beta-1", properties: { symbol: "AAPL" } });
  await analyticsService.recordEvent({ eventName: "recommendation_expanded", betaUserId: "beta-1", durationMs: 8000, properties: { stepKey: "thesis" } });
  await analyticsService.recordEvent({ eventName: "explanation_collapsed", betaUserId: "beta-1" });

  const insights = await explainabilityInsightsService.getExplainabilityInsights();
  assert.equal(insights.recommendationsShown, 2);
  assert.equal(insights.explanationsExpanded, 1);
  assert.equal(insights.expandRate, 0.5);
  assert.equal(insights.avgReadingTimeMs, 8000);
  assert.equal(insights.stepBreakdown[0].stepKey, "thesis");
});

test("flags a low expand rate with a real, specific insight", async () => {
  for (let i = 0; i < 10; i++) {
    await analyticsService.recordEvent({ eventName: "recommendation_viewed", betaUserId: "beta-1", properties: { symbol: "NVDA" } });
  }
  await analyticsService.recordEvent({ eventName: "recommendation_expanded", betaUserId: "beta-1", durationMs: 1000 });

  const insights = await explainabilityInsightsService.getExplainabilityInsights();
  assert.ok(insights.insights.some((text) => text.includes("expanded")));
});
