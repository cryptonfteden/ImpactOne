require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const { getPrismaClient } = require("../db/prismaClient");
const autonomousRecommendationRepository = require("./autonomousRecommendationRepository");
const userMemoryRepository = require("./userMemoryRepository");
const portfolioEngineService = require("./portfolioEngineService");
const investorMemoryService = require("./investorMemoryService");
const betaUserRepository = require("./betaUserRepository");

let USER;

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

test.before(async () => {
  const inviteCode = "TEST-INVESTOR-MEMORY-SERVICE-001";
  const existing = await betaUserRepository.findByInviteCode(inviteCode);
  const betaUser = existing || (await betaUserRepository.createBetaUser({ label: "Investor Memory Test User", inviteCode }));
  USER = betaUser.id;
});

test.beforeEach(async () => {
  await truncateAll();
});

// Phase PERSONALIZATION-PRIVACY-001 — every exported function must now
// require a real betaUserId; this is the mission's central requirement.
test("Phase PERSONALIZATION-PRIVACY-001 — every exported function throws a clear, typed error without a betaUserId", async () => {
  await assert.rejects(() => investorMemoryService.getInvestorMemory(), (error) => error.statusCode === 400);
  await assert.rejects(() => investorMemoryService.computeReadingDepth(), (error) => error.statusCode === 400);
  await assert.rejects(() => investorMemoryService.computeHoldingBehavior(), (error) => error.statusCode === 400);
});

test("getInvestorMemory is honest about insufficient data with no activity", async () => {
  const memory = await investorMemoryService.getInvestorMemory(USER);
  assert.deepEqual(memory.favoriteSectors, []);
  assert.deepEqual(memory.favoriteThemes, []);
  assert.equal(memory.readingDepth.hasEnoughData, false);
  assert.equal(memory.holdingBehavior.hasEnoughData, false);
});

test("getInvestorMemory reports real favorite sectors and themes from UserMemoryEvent", async () => {
  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "NVDA", sector: "Technology", betaUserId: USER });
  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "MSFT", sector: "Technology", betaUserId: USER });
  await userMemoryRepository.appendEvent({ eventType: "THEME_VIEWED", subject: "ai", betaUserId: USER });
  await userMemoryRepository.appendEvent({ eventType: "THEME_VIEWED", subject: "ai", betaUserId: USER });

  const memory = await investorMemoryService.getInvestorMemory(USER);
  assert.equal(memory.favoriteSectors[0].sector, "Technology");
  assert.equal(memory.favoriteSectors[0].viewCount, 2);
  assert.equal(memory.favoriteThemes[0].themeKey, "ai");
  assert.equal(memory.favoriteThemes[0].viewCount, 2);
});

test("computeReadingDepth reflects the real ratio of viewed recommendations that received feedback", async () => {
  const nvda = await autonomousRecommendationRepository.createRecommendation(recommendationData({ symbol: "NVDA" }));
  await autonomousRecommendationRepository.createRecommendation(recommendationData({ symbol: "AAPL" }));

  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "NVDA", betaUserId: USER });
  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "AAPL", betaUserId: USER });
  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "AAPL", betaUserId: USER });
  await autonomousRecommendationRepository.createFeedback({ recommendationId: nvda.id, feedbackType: "USEFUL", betaUserId: USER });

  const result = await investorMemoryService.computeReadingDepth(USER);
  assert.equal(result.hasEnoughData, true);
  assert.equal(result.totalViews, 3);
  assert.equal(result.viewedSymbolsWithFeedbackCount, 1);
  assert.equal(result.depthRatioPct, 50);
});

test("computeHoldingBehavior pairs real BUY/SELL trades and computes an honest average holding period", async () => {
  const portfolio = await portfolioEngineService.getOrCreateDefaultPortfolio(USER);
  const prisma = getPrismaClient();

  const buyOrder = await prisma.order.create({ data: { portfolioId: portfolio.id, symbol: "NVDA", side: "BUY", quantity: 10, requestedPrice: 100, status: "FILLED" } });
  await prisma.trade.create({ data: { orderId: buyOrder.id, portfolioId: portfolio.id, symbol: "NVDA", side: "BUY", quantity: 10, price: 100, executedAt: new Date("2026-07-01T00:00:00.000Z") } });

  const sellOrder = await prisma.order.create({ data: { portfolioId: portfolio.id, symbol: "NVDA", side: "SELL", quantity: 10, requestedPrice: 110, status: "FILLED" } });
  await prisma.trade.create({ data: { orderId: sellOrder.id, portfolioId: portfolio.id, symbol: "NVDA", side: "SELL", quantity: 10, price: 110, realizedPnl: 100, executedAt: new Date("2026-07-11T00:00:00.000Z") } });

  // Below MIN_SAMPLE (3) — should be honest about insufficient data.
  const early = await investorMemoryService.computeHoldingBehavior(USER);
  assert.equal(early.hasEnoughData, false);

  for (let i = 0; i < 2; i += 1) {
    const buy = await prisma.order.create({ data: { portfolioId: portfolio.id, symbol: "AAPL", side: "BUY", quantity: 5, requestedPrice: 50, status: "FILLED" } });
    await prisma.trade.create({ data: { orderId: buy.id, portfolioId: portfolio.id, symbol: "AAPL", side: "BUY", quantity: 5, price: 50, executedAt: new Date(`2026-07-0${i + 2}T00:00:00.000Z`) } });
    const sell = await prisma.order.create({ data: { portfolioId: portfolio.id, symbol: "AAPL", side: "SELL", quantity: 5, requestedPrice: 55, status: "FILLED" } });
    await prisma.trade.create({ data: { orderId: sell.id, portfolioId: portfolio.id, symbol: "AAPL", side: "SELL", quantity: 5, price: 55, executedAt: new Date(`2026-07-0${i + 3}T00:00:00.000Z`) } });
  }

  const result = await investorMemoryService.computeHoldingBehavior(USER);
  assert.equal(result.hasEnoughData, true);
  assert.equal(result.closedRoundTrips, 3);
  assert.ok(result.avgHoldingDays > 0);
});

test("Investor Memory never writes anything (read-only synthesis) — no create/update/delete exports", () => {
  const exportedNames = Object.keys(investorMemoryService);
  assert.deepEqual(exportedNames.sort(), ["computeHoldingBehavior", "computeReadingDepth", "getInvestorMemory"].sort());
});

// Phase PERSONALIZATION-PRIVACY-001 — the mission's central requirement:
// verify, end to end through the real service (not just the repository
// layer), that one user's real behavior cannot affect another user's
// investor memory.
test("Phase PERSONALIZATION-PRIVACY-001 — one user's real activity never affects another user's investor memory (multi-user isolation)", async () => {
  const inviteCode = "TEST-INVESTOR-MEMORY-SERVICE-001-USER-B";
  const existing = await betaUserRepository.findByInviteCode(inviteCode);
  const userB = existing || (await betaUserRepository.createBetaUser({ label: "User B", inviteCode }));

  // User A builds up real, heavy Technology-sector interest.
  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "NVDA", sector: "Technology", betaUserId: USER });
  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "MSFT", sector: "Technology", betaUserId: USER });
  await userMemoryRepository.appendEvent({ eventType: "THEME_VIEWED", subject: "ai", betaUserId: USER });

  const nvda = await autonomousRecommendationRepository.createRecommendation(recommendationData({ symbol: "NVDA" }));
  await autonomousRecommendationRepository.createFeedback({ recommendationId: nvda.id, feedbackType: "USEFUL", betaUserId: USER });

  // User B has done nothing at all — their investor memory must be
  // entirely, honestly empty, never inheriting any of User A's signal.
  const memoryB = await investorMemoryService.getInvestorMemory(userB.id);
  assert.deepEqual(memoryB.favoriteSectors, []);
  assert.deepEqual(memoryB.favoriteThemes, []);
  assert.equal(memoryB.readingDepth.hasEnoughData, false);
  assert.equal(memoryB.reactionPatterns.totalFeedback, 0, "User B must not see User A's real feedback in their own reaction patterns");

  // User A's own memory must remain fully intact and correct.
  const memoryA = await investorMemoryService.getInvestorMemory(USER);
  assert.equal(memoryA.favoriteSectors[0].sector, "Technology");
  assert.equal(memoryA.favoriteThemes[0].themeKey, "ai");
});
