require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const { getPrismaClient } = require("../db/prismaClient");
const personalizationService = require("./personalizationService");
const analyticsService = require("./analyticsService");
const investorProfileService = require("./investorProfileService");
const portfolioEngineService = require("./portfolioEngineService");

test.beforeEach(async () => {
  await truncateAll();
});

test("requires a real beta user identity", async () => {
  await assert.rejects(() => personalizationService.getPersonalizationProfile(null), (error) => error.statusCode === 400);
});

test("returns an honest, empty profile with no real signal yet", async () => {
  const profile = await personalizationService.getPersonalizationProfile("beta-1");
  assert.equal(profile.preferredRiskLevel, null);
  assert.equal(profile.preferredHoldingPeriod, null);
  assert.deepEqual(profile.preferredSectors, []);
  assert.deepEqual(profile.preferredMarketCapExposure, []);
  assert.deepEqual(profile.preferredRecommendationStyle, []);
  assert.equal(profile.preferredExplanationDepth.depth, null);
  assert.deepEqual(profile.preferredNewsSources.sources, []);
});

test("reuses the real investor profile risk tolerance and horizon", async () => {
  await investorProfileService.createInvestorProfile({ age: 30, riskTolerance: "HIGH", investmentHorizon: "LONG_TERM" }, "beta-1");
  const profile = await personalizationService.getPersonalizationProfile("beta-1");
  assert.equal(profile.preferredRiskLevel, "HIGH");
  assert.equal(profile.preferredHoldingPeriod, "LONG_TERM");
});

test("derives preferred sectors and asset types from real held positions", async () => {
  await portfolioEngineService.getPortfolioSummary("beta-1");
  const prisma = getPrismaClient();
  const portfolio = await prisma.portfolio.findFirst({ where: { betaUserId: "beta-1" } });
  await prisma.position.create({
    data: { portfolioId: portfolio.id, symbol: "NVDA", quantity: 10, avgEntryPrice: 100, sector: "Technology", assetType: "Equity" },
  });

  const profile = await personalizationService.getPersonalizationProfile("beta-1");
  assert.equal(profile.preferredSectors[0].key, "Technology");
  assert.equal(profile.preferredMarketCapExposure[0].key, "Equity");
});

test("derives preferred explanation depth from real expand/collapse ratio", async () => {
  await analyticsService.recordEvent({ eventName: "recommendation_expanded", betaUserId: "beta-1" });
  await analyticsService.recordEvent({ eventName: "recommendation_expanded", betaUserId: "beta-1" });
  await analyticsService.recordEvent({ eventName: "explanation_collapsed", betaUserId: "beta-1" });

  const profile = await personalizationService.getPersonalizationProfile("beta-1");
  assert.equal(profile.preferredExplanationDepth.depth, "DETAILED");
});
