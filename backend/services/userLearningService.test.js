require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const { getPrismaClient } = require("../db/prismaClient");
const userLearningService = require("./userLearningService");
const analyticsService = require("./analyticsService");

test.beforeEach(async () => {
  await truncateAll();
});

test("requires a real beta user identity", async () => {
  await assert.rejects(() => userLearningService.getUserLearningProfile(null), (error) => error.statusCode === 400);
});

test("returns an honest, all-zero profile with no real interactions yet", async () => {
  const profile = await userLearningService.getUserLearningProfile("beta-1");
  assert.equal(profile.totalInteractions, 0);
  assert.equal(profile.recommendationsViewed, 0);
  assert.equal(profile.averageChartWatchTimeMs, null);
  assert.equal(profile.lastActiveAt, null);
});

test("counts real interactions correctly, isolated per beta user", async () => {
  await analyticsService.recordEvent({ eventName: "recommendation_viewed", betaUserId: "beta-1", properties: { symbol: "NVDA", recommendationId: "rec-1" } });
  await analyticsService.recordEvent({ eventName: "recommendation_opened", betaUserId: "beta-1", properties: { symbol: "NVDA", recommendationId: "rec-1" } });
  await analyticsService.recordEvent({ eventName: "chart_opened", betaUserId: "beta-1", durationMs: 15000 });
  await analyticsService.recordEvent({ eventName: "recommendation_viewed", betaUserId: "beta-2", properties: { symbol: "AAPL" } });

  const profile = await userLearningService.getUserLearningProfile("beta-1");
  assert.equal(profile.totalInteractions, 3);
  assert.equal(profile.recommendationsViewed, 1);
  assert.equal(profile.recommendationsOpened, 1);
  assert.equal(profile.chartsOpened, 1);
  assert.equal(profile.averageChartWatchTimeMs, 15000);
});

test("a recommendation viewed but never opened/saved/dismissed counts as ignored", async () => {
  await analyticsService.recordEvent({ eventName: "recommendation_viewed", betaUserId: "beta-1", properties: { symbol: "NVDA", recommendationId: "rec-1" } });
  await analyticsService.recordEvent({ eventName: "recommendation_viewed", betaUserId: "beta-1", properties: { symbol: "AAPL", recommendationId: "rec-2" } });
  await analyticsService.recordEvent({ eventName: "recommendation_opened", betaUserId: "beta-1", properties: { symbol: "AAPL", recommendationId: "rec-2" } });

  const profile = await userLearningService.getUserLearningProfile("beta-1");
  assert.equal(profile.recommendationsIgnored, 1);
});

test("mostEngagedSymbols reflects real engagement counts, sorted descending", async () => {
  for (let i = 0; i < 3; i++) {
    await analyticsService.recordEvent({ eventName: "recommendation_viewed", betaUserId: "beta-1", properties: { symbol: "NVDA" } });
  }
  await analyticsService.recordEvent({ eventName: "recommendation_viewed", betaUserId: "beta-1", properties: { symbol: "AAPL" } });

  const profile = await userLearningService.getUserLearningProfile("beta-1");
  assert.equal(profile.mostEngagedSymbols[0].symbol, "NVDA");
  assert.equal(profile.mostEngagedSymbols[0].count, 3);
});
