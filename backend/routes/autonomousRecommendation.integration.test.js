require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const { truncateAll } = require("../test/dbHelpers");
const autonomousMarketService = require("../services/autonomousMarketService");
const portfolioEngineService = require("../services/portfolioEngineService");
const intelligenceCommitteeService = require("../services/intelligenceCommittee/intelligenceCommitteeService");
const app = require("../app");

function neutralRanking(symbol) {
  return { symbol, opportunityScore: 55, riskScore: 45, overallAiScore: 58, primaryDriver: "No dominant event", explanation: `${symbol} is range-bound.` };
}

// Sprint 41 — Committee Unification: stands in for a real convene() call
// (the ONE unified committee) so these route-level tests stay fast and
// don't depend on building a full evidence matrix.
const TEST_COMMITTEE_DEBATE = {
  committee: {
    members: [{ memberId: "technicalAnalyst", memberName: "Technical Analyst", headline: "h", reasoning: "r", supportingEvidence: [{ category: "TECHNICAL", reason: "Uptrend" }], counterEvidence: [], confidence: 70, uncertainty: 30, freshness: "CURRENT", missingEvidence: [], isRecommendation: false }],
    agreement: { status: "AGREEMENT", direction: "SUPPORTIVE", members: ["technicalAnalyst"] },
    disagreement: { status: "NO_DISAGREEMENT", supportiveMembers: [], contraryMembers: [] },
    strongestSupportingEvidence: { memberId: "technicalAnalyst", category: "TECHNICAL", reason: "Uptrend", memberConfidence: 70 },
    strongestContradictoryEvidence: null,
    missingEvidence: [],
    staleEvidence: [],
    isVerdict: false,
  },
  cio: {
    overallThesis: "Committee leans supportive.",
    confidence: "HIGH_UNANIMOUS",
    largestDisagreement: null,
    highestRisk: "No single strongest counter-evidence was reported by any member.",
    missingInformation: [],
    whyRecommendationExists: "Independent members converged.",
    whyRecommendationMayBeWrong: [],
    isVerdict: false,
  },
};

async function withMocks(run) {
  const originalOverview = autonomousMarketService.getAutonomousOverview;
  const originalSummary = portfolioEngineService.getPortfolioSummary;
  const originalConvene = intelligenceCommitteeService.convene;

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
  intelligenceCommitteeService.convene = async () => TEST_COMMITTEE_DEBATE;

  try {
    return await run();
  } finally {
    autonomousMarketService.getAutonomousOverview = originalOverview;
    portfolioEngineService.getPortfolioSummary = originalSummary;
    intelligenceCommitteeService.convene = originalConvene;
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

test("POST /api/v2/recommendations/run accepts a watchlist in the request body and marks its symbols as watchlist-sourced", async () => {
  const originalOverview = autonomousMarketService.getAutonomousOverview;
  const originalSummary = portfolioEngineService.getPortfolioSummary;
  const originalConvene = intelligenceCommitteeService.convene;

  autonomousMarketService.getAutonomousOverview = async ({ watchlist }) => ({
    feed: [],
    watchlistRankings: watchlist.map((symbol) =>
      symbol === "PLTRX"
        ? { symbol, opportunityScore: 92, riskScore: 25, overallAiScore: 90, primaryDriver: "Contract win", explanation: "New contract announced." }
        : neutralRanking(symbol)
    ),
    globalMap: { macroRegime: { recessionRisk: "low", inflationPressure: "low" } },
  });
  portfolioEngineService.getPortfolioSummary = async () => ({
    portfolioId: "test-portfolio",
    totalValue: 100000,
    positionsValue: 0,
    positions: [],
    allocation: { bySector: [], byAssetType: [] },
  });
  intelligenceCommitteeService.convene = async () => TEST_COMMITTEE_DEBATE;

  try {
    const runResponse = await request(app).post("/api/v2/recommendations/run").send({ watchlist: ["PLTRX"] });
    assert.equal(runResponse.status, 201);

    const listResponse = await request(app).get("/api/v2/recommendations");
    const pltrx = listResponse.body.recommendations.find((item) => item.symbol === "PLTRX");
    assert.ok(pltrx, "expected a recommendation for the body-provided watchlist symbol");
    assert.equal(pltrx.evidence.symbolSource, "watchlist");
  } finally {
    autonomousMarketService.getAutonomousOverview = originalOverview;
    portfolioEngineService.getPortfolioSummary = originalSummary;
    intelligenceCommitteeService.convene = originalConvene;
  }
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

test("GET /api/v2/recommendations/:id includes explanation, scenarios, and qualityScore", async () => {
  await withMocks(async () => {
    await request(app).post("/api/v2/recommendations/run");
    const listResponse = await request(app).get("/api/v2/recommendations");
    const id = listResponse.body.recommendations[0].id;

    const detailResponse = await request(app).get(`/api/v2/recommendations/${id}`);
    assert.equal(detailResponse.status, 200);
    assert.ok(detailResponse.body.explanation.thesis);
    assert.equal(detailResponse.body.scenarios.length, 3);
    assert.ok(Number.isFinite(Number(detailResponse.body.qualityScore)));
    assert.ok(detailResponse.body.qualityComponents.modelConfidence !== undefined);
  });
});

test("GET /api/v2/recommendations/:id/decision-trace returns the trace for a generated recommendation", async () => {
  await withMocks(async () => {
    await request(app).post("/api/v2/recommendations/run");
    const listResponse = await request(app).get("/api/v2/recommendations");
    const id = listResponse.body.recommendations[0].id;

    const traceResponse = await request(app).get(`/api/v2/recommendations/${id}/decision-trace`);
    assert.equal(traceResponse.status, 200);
    assert.equal(traceResponse.body.recommendationId, id);
    assert.ok(traceResponse.body.rankingResult);
    assert.ok(traceResponse.body.finalOutput);
  });
});

test("GET /api/v2/recommendations/:id/decision-trace returns 404 for an unknown recommendation id", async () => {
  const response = await request(app).get("/api/v2/recommendations/does-not-exist/decision-trace");
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
