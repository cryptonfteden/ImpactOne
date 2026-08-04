require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const { getPrismaClient } = require("../db/prismaClient");
const autonomousRecommendationRepository = require("./autonomousRecommendationRepository");
const userMemoryRepository = require("./userMemoryRepository");
const portfolioEngineService = require("./portfolioEngineService");
const personalProgressService = require("./personalProgressService");

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

async function seedSnapshot({ portfolioId, totalValue, cashBalance }) {
  const prisma = getPrismaClient();
  return prisma.performanceSnapshot.create({
    data: { portfolioId, totalValue, cashBalance, positionsValue: totalValue - cashBalance, realizedPnl: 0, unrealizedPnl: 0, totalReturnPct: 0 },
  });
}

test.beforeEach(async () => {
  await truncateAll();
});

test("computePersonalProgress is honest about insufficient data across all three dimensions with no activity", async () => {
  const progress = await personalProgressService.computePersonalProgress();
  assert.equal(progress.understanding.hasEnoughData, false);
  assert.equal(progress.readingHabits.hasEnoughData, false);
  assert.equal(progress.portfolioDiscipline.hasEnoughData, false);
  assert.match(progress.understanding.message, /More feedback needed/);
});

test("computeUnderstandingProgress detects improving understanding when DONT_UNDERSTAND feedback ratio falls over time", async () => {
  const rec = await autonomousRecommendationRepository.createRecommendation(recommendationData());
  for (let i = 0; i < 3; i += 1) {
    await autonomousRecommendationRepository.createFeedback({ recommendationId: rec.id, feedbackType: "DONT_UNDERSTAND" });
  }
  for (let i = 0; i < 3; i += 1) {
    await autonomousRecommendationRepository.createFeedback({ recommendationId: rec.id, feedbackType: "USEFUL" });
  }

  const result = await personalProgressService.computeUnderstandingProgress();
  assert.equal(result.hasEnoughData, true);
  assert.equal(result.earlierDontUnderstandRatePct, 100);
  assert.equal(result.recentDontUnderstandRatePct, 0);
  assert.equal(result.trend, "improving");
});

test("computeReadingHabitsProgress reports real view-count trend from UserMemoryEvent", async () => {
  assert.equal((await personalProgressService.computeReadingHabitsProgress()).hasEnoughData, false, "zero events is below the minimum for a split");

  // Explicit timestamps, not wall-clock timing, so the earlier/recent
  // time-midpoint split is deterministic: 3 events on day 1 (the "earlier"
  // half of the real time range), 9 events on day 10 (the "recent" half).
  const prisma = getPrismaClient();
  const earlierDay = new Date("2026-07-01T00:00:00.000Z");
  const recentDay = new Date("2026-07-10T00:00:00.000Z");
  for (let i = 0; i < 3; i += 1) {
    await prisma.userMemoryEvent.create({ data: { eventType: "RECOMMENDATION_VIEWED", subject: "NVDA", createdAt: new Date(earlierDay.getTime() + i * 1000) } });
  }
  for (let i = 0; i < 9; i += 1) {
    await prisma.userMemoryEvent.create({ data: { eventType: "THEME_VIEWED", subject: "ai", createdAt: new Date(recentDay.getTime() + i * 1000) } });
  }

  const result = await personalProgressService.computeReadingHabitsProgress();
  assert.equal(result.hasEnoughData, true);
  assert.equal(result.earlierViewCount, 3);
  assert.equal(result.recentViewCount, 9);
  assert.equal(result.trend, "more engaged");
});

test("computePortfolioDisciplineProgress reports a real cash-reserve trend from PerformanceSnapshot history", async () => {
  const portfolio = await portfolioEngineService.getOrCreateDefaultPortfolio();
  await seedSnapshot({ portfolioId: portfolio.id, totalValue: 100000, cashBalance: 10000 });
  await seedSnapshot({ portfolioId: portfolio.id, totalValue: 100000, cashBalance: 10000 });
  await seedSnapshot({ portfolioId: portfolio.id, totalValue: 100000, cashBalance: 10000 });
  await seedSnapshot({ portfolioId: portfolio.id, totalValue: 100000, cashBalance: 40000 });
  await seedSnapshot({ portfolioId: portfolio.id, totalValue: 100000, cashBalance: 40000 });
  await seedSnapshot({ portfolioId: portfolio.id, totalValue: 100000, cashBalance: 40000 });

  const result = await personalProgressService.computePortfolioDisciplineProgress();
  assert.equal(result.hasEnoughData, true);
  assert.equal(result.earlierCashRatioPct, 10);
  assert.equal(result.recentCashRatioPct, 40);
  assert.equal(result.trend, "improving");
});

test("Personal Progress never exposes a score, points, streak, or badge field (never gamify)", async () => {
  const progress = await personalProgressService.computePersonalProgress();
  const serialized = JSON.stringify(progress).toLowerCase();
  assert.equal(/"score"|"points"|"streak"|"badge"|"level"|"xp"/.test(serialized), false, "Personal Progress must never contain gamification fields");
});
