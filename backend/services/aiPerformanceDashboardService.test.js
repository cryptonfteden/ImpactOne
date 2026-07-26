require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const aiPerformanceDashboardService = require("./aiPerformanceDashboardService");
const analyticsService = require("./analyticsService");
const investorProfileService = require("./investorProfileService");

test.beforeEach(async () => {
  await truncateAll();
});

test("returns an honest, empty-state dashboard with no real data yet", async () => {
  const dashboard = await aiPerformanceDashboardService.getAiPerformanceDashboard();
  assert.equal(dashboard.recommendationAccuracy.hitRate, null);
  assert.equal(dashboard.sourceQuality.totalSources, 0);
  assert.equal(dashboard.userEngagement.totalInteractions, 0);
  assert.ok(dashboard.modelDrift.reason);
  assert.equal(dashboard.personalizationQuality.coverageRate, null);
});

test("reflects real engagement and personalization data", async () => {
  await analyticsService.recordEvent({ eventName: "recommendation_saved", betaUserId: "beta-1", properties: { symbol: "NVDA" } });
  await investorProfileService.createInvestorProfile({ age: 30, riskTolerance: "HIGH", investmentHorizon: "LONG_TERM" }, "beta-1");

  const dashboard = await aiPerformanceDashboardService.getAiPerformanceDashboard();
  assert.equal(dashboard.userEngagement.totalInteractions, 1);
  assert.equal(dashboard.userEngagement.recommendationsSaved, 1);
  assert.equal(dashboard.personalizationQuality.coverageRate, 100);
});
