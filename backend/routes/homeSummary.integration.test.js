require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const { truncateAll } = require("../test/dbHelpers");
const autonomousMarketService = require("../services/autonomousMarketService");
const portfolioEngineService = require("../services/portfolioEngineService");
const app = require("../app");

test.beforeEach(async () => {
  await truncateAll();
});

test("GET /api/v2/home-summary returns all six question fields (Sprint 24)", async () => {
  const originalOverview = autonomousMarketService.getAutonomousOverview;
  const originalSummary = portfolioEngineService.getPortfolioSummary;

  autonomousMarketService.getAutonomousOverview = async () => ({ feed: [], globalMap: {} });
  portfolioEngineService.getPortfolioSummary = async () => ({
    portfolioId: "test-portfolio",
    totalValue: 100000,
    positionsValue: 0,
    positions: [],
    allocation: { bySector: [], byAssetType: [] },
  });

  try {
    const response = await request(app).get("/api/v2/home-summary");
    assert.equal(response.status, 200);
    assert.ok("whatHappened" in response.body);
    assert.ok("whyShouldICare" in response.body);
    assert.ok("howDoesItAffectMe" in response.body);
    assert.ok("whatChangedSinceYesterday" in response.body);
    assert.ok("whatChangedForMyPortfolio" in response.body);
    assert.ok("whatChangedInBeliefs" in response.body);
    assert.ok("shouldIDoAnythingToday" in response.body);
    assert.equal(response.body.shouldIDoAnythingToday.hasAction, false);
  } finally {
    autonomousMarketService.getAutonomousOverview = originalOverview;
    portfolioEngineService.getPortfolioSummary = originalSummary;
  }
});
