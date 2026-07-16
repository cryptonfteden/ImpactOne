require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const { getPrismaClient } = require("../db/prismaClient");
const autonomousRecommendationRepository = require("./autonomousRecommendationRepository");
const userMemoryRepository = require("./userMemoryRepository");
const portfolioEngineService = require("./portfolioEngineService");
const investorMemoryService = require("./investorMemoryService");

function recommendationData(overrides = {}) {
  return {
    symbol: "NVDA",
    action: "BUY",
    confidenceScore: 80,
    expectedUpside: "10-15%",
    expectedDownside: "-6%",
    riskScore: 30,
    riskLabel: "Low",
    positionSizeSuggestion: "2-4%",
    reasoning: "Test.",
    evidence: {},
    portfolioContext: null,
    timeHorizon: "1-3 months",
    explanation: { thesis: "Test.", supportingEvidence: [], opposingEvidence: [], keyRisks: [], invalidationConditions: [], timeHorizon: "1-3 months", affectedPositions: [], affectedWatchlistSymbols: [], confidenceDrivers: [], confidenceReducers: [] },
    scenarios: [],
    qualityScore: 75,
    qualityComponents: {},
    ...overrides,
  };
}

test.beforeEach(async () => {
  await truncateAll();
});

test("getInvestorMemory is honest about insufficient data with no activity", async () => {
  const memory = await investorMemoryService.getInvestorMemory();
  assert.deepEqual(memory.favoriteSectors, []);
  assert.deepEqual(memory.favoriteThemes, []);
  assert.equal(memory.readingDepth.hasEnoughData, false);
  assert.equal(memory.holdingBehavior.hasEnoughData, false);
});

test("getInvestorMemory reports real favorite sectors and themes from UserMemoryEvent", async () => {
  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "NVDA", sector: "Technology" });
  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "MSFT", sector: "Technology" });
  await userMemoryRepository.appendEvent({ eventType: "THEME_VIEWED", subject: "ai" });
  await userMemoryRepository.appendEvent({ eventType: "THEME_VIEWED", subject: "ai" });

  const memory = await investorMemoryService.getInvestorMemory();
  assert.equal(memory.favoriteSectors[0].sector, "Technology");
  assert.equal(memory.favoriteSectors[0].viewCount, 2);
  assert.equal(memory.favoriteThemes[0].themeKey, "ai");
  assert.equal(memory.favoriteThemes[0].viewCount, 2);
});

test("computeReadingDepth reflects the real ratio of viewed recommendations that received feedback", async () => {
  const nvda = await autonomousRecommendationRepository.createRecommendation(recommendationData({ symbol: "NVDA" }));
  await autonomousRecommendationRepository.createRecommendation(recommendationData({ symbol: "AAPL" }));

  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "NVDA" });
  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "AAPL" });
  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "AAPL" });
  await autonomousRecommendationRepository.createFeedback({ recommendationId: nvda.id, feedbackType: "USEFUL" });

  const result = await investorMemoryService.computeReadingDepth();
  assert.equal(result.hasEnoughData, true);
  assert.equal(result.totalViews, 3);
  assert.equal(result.viewedSymbolsWithFeedbackCount, 1);
  assert.equal(result.depthRatioPct, 50);
});

test("computeHoldingBehavior pairs real BUY/SELL trades and computes an honest average holding period", async () => {
  const portfolio = await portfolioEngineService.getOrCreateDefaultPortfolio();
  const prisma = getPrismaClient();

  const buyOrder = await prisma.order.create({ data: { portfolioId: portfolio.id, symbol: "NVDA", side: "BUY", quantity: 10, requestedPrice: 100, status: "FILLED" } });
  await prisma.trade.create({ data: { orderId: buyOrder.id, portfolioId: portfolio.id, symbol: "NVDA", side: "BUY", quantity: 10, price: 100, executedAt: new Date("2026-07-01T00:00:00.000Z") } });

  const sellOrder = await prisma.order.create({ data: { portfolioId: portfolio.id, symbol: "NVDA", side: "SELL", quantity: 10, requestedPrice: 110, status: "FILLED" } });
  await prisma.trade.create({ data: { orderId: sellOrder.id, portfolioId: portfolio.id, symbol: "NVDA", side: "SELL", quantity: 10, price: 110, realizedPnl: 100, executedAt: new Date("2026-07-11T00:00:00.000Z") } });

  // Below MIN_SAMPLE (3) — should be honest about insufficient data.
  const early = await investorMemoryService.computeHoldingBehavior();
  assert.equal(early.hasEnoughData, false);

  for (let i = 0; i < 2; i += 1) {
    const buy = await prisma.order.create({ data: { portfolioId: portfolio.id, symbol: "AAPL", side: "BUY", quantity: 5, requestedPrice: 50, status: "FILLED" } });
    await prisma.trade.create({ data: { orderId: buy.id, portfolioId: portfolio.id, symbol: "AAPL", side: "BUY", quantity: 5, price: 50, executedAt: new Date(`2026-07-0${i + 2}T00:00:00.000Z`) } });
    const sell = await prisma.order.create({ data: { portfolioId: portfolio.id, symbol: "AAPL", side: "SELL", quantity: 5, requestedPrice: 55, status: "FILLED" } });
    await prisma.trade.create({ data: { orderId: sell.id, portfolioId: portfolio.id, symbol: "AAPL", side: "SELL", quantity: 5, price: 55, executedAt: new Date(`2026-07-0${i + 3}T00:00:00.000Z`) } });
  }

  const result = await investorMemoryService.computeHoldingBehavior();
  assert.equal(result.hasEnoughData, true);
  assert.equal(result.closedRoundTrips, 3);
  assert.ok(result.avgHoldingDays > 0);
});

test("Investor Memory never writes anything (read-only synthesis) — no create/update/delete exports", () => {
  const exportedNames = Object.keys(investorMemoryService);
  assert.deepEqual(exportedNames.sort(), ["computeHoldingBehavior", "computeReadingDepth", "getInvestorMemory"].sort());
});
