require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const { truncateAll } = require("../test/dbHelpers");
const autonomousMarketService = require("../services/autonomousMarketService");
const portfolioEngineService = require("../services/portfolioEngineService");
const app = require("../app");

function neutralRanking(symbol) {
  return { symbol, opportunityScore: 55, riskScore: 45, overallAiScore: 58, primaryDriver: "No dominant event", explanation: `${symbol} is range-bound.` };
}

async function withMocks(run) {
  const originalOverview = autonomousMarketService.getAutonomousOverview;
  const originalSummary = portfolioEngineService.getPortfolioSummary;

  autonomousMarketService.getAutonomousOverview = async () => ({
    feed: [],
    watchlistRankings: [
      { symbol: "NVDA", opportunityScore: 90, riskScore: 30, overallAiScore: 88, primaryDriver: "AI capex surge", explanation: "Strong AI capex tailwind." },
      neutralRanking("AAPL"),
      neutralRanking("TSLA"),
    ],
    globalMap: { macroRegime: { recessionRisk: "low", inflationPressure: "low" } },
  });
  portfolioEngineService.getPortfolioSummary = async () => ({
    portfolioId: "test-portfolio",
    totalValue: 100000,
    positionsValue: 0,
    positions: [],
    allocation: { bySector: [], byAssetType: [] },
  });

  try {
    return await run();
  } finally {
    autonomousMarketService.getAutonomousOverview = originalOverview;
    portfolioEngineService.getPortfolioSummary = originalSummary;
  }
}

test.beforeEach(async () => {
  await truncateAll();
});

test("GET /api/v2/recommendations returns an empty list before any run", async () => {
  const response = await request(app).get("/api/v2/recommendations");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.recommendations, []);
});

test("POST /api/v2/recommendations/run generates recommendations, then GET lists them", async () => {
  await withMocks(async () => {
    const runResponse = await request(app).post("/api/v2/recommendations/run");
    assert.equal(runResponse.status, 201);
    assert.equal(runResponse.body.recommendationsGenerated, 1);

    const listResponse = await request(app).get("/api/v2/recommendations");
    assert.equal(listResponse.status, 200);
    assert.equal(listResponse.body.recommendations.length, 1);
    assert.equal(listResponse.body.recommendations[0].symbol, "NVDA");
    assert.equal(listResponse.body.recommendations[0].action, "BUY");

    const detailResponse = await request(app).get(`/api/v2/recommendations/${listResponse.body.recommendations[0].id}`);
    assert.equal(detailResponse.status, 200);
    assert.ok(detailResponse.body.reasoning);
  });
});

test("GET /api/v2/recommendations/status reports engine status and last run", async () => {
  await withMocks(async () => {
    await request(app).post("/api/v2/recommendations/run");
    const statusResponse = await request(app).get("/api/v2/recommendations/status");
    assert.equal(statusResponse.status, 200);
    assert.equal(typeof statusResponse.body.enabled, "boolean");
    assert.ok(statusResponse.body.latestRunLog);
    assert.equal(statusResponse.body.latestRunLog.recommendationsGenerated, 1);
  });
});

test("GET /api/v2/recommendations/:id returns 404 for an unknown id", async () => {
  const response = await request(app).get("/api/v2/recommendations/does-not-exist");
  assert.equal(response.status, 404);
});

test("this feature never places an order as a side effect", async () => {
  await withMocks(async () => {
    await request(app).post("/api/v2/recommendations/run");

    // getTradeHistory is not mocked here — this hits the real portfolio
    // repository/DB, so a non-empty result would mean the engine actually
    // placed a trade.
    const tradesResponse = await request(app).get("/api/v2/portfolio/trades");
    assert.equal(tradesResponse.status, 200);
    assert.equal(tradesResponse.body.trades.length, 0);
  });
});
