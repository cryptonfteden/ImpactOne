require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const { getPrismaClient } = require("../db/prismaClient");
const autonomousRecommendationRepository = require("./autonomousRecommendationRepository");
const worldMemoryRepository = require("./worldMemoryRepository");
const finnhubService = require("./finnhubService");
const outcomeGradingService = require("./outcomeGradingService");

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
    reasoning: "Test reasoning.",
    evidence: { currentPrice: 100 },
    portfolioContext: null,
    timeHorizon: "1-3 months",
    explanation: { thesis: "Test thesis.", supportingEvidence: [], opposingEvidence: [], keyRisks: [], invalidationConditions: [], timeHorizon: "1-3 months", affectedPositions: [], affectedWatchlistSymbols: [], confidenceDrivers: [], confidenceReducers: [] },
    scenarios: [],
    qualityScore: 75,
    qualityComponents: {},
    ...overrides,
  };
}

async function createGradablePrediction({ recommendationOverrides = {}, predictedAction = "BUY", predictedAt } = {}) {
  const recommendation = await autonomousRecommendationRepository.createRecommendation(recommendationData(recommendationOverrides));
  const record = await worldMemoryRepository.createRecord({
    canonicalEventId: null,
    occurredAt: new Date(),
    primaryThemeKey: null,
    symbols: [recommendation.symbol],
    sectors: [],
    headline: `Recommendation: ${predictedAction} ${recommendation.symbol}`,
  });
  const prisma = getPrismaClient();
  const prediction = await prisma.worldMemoryPrediction.create({
    data: {
      worldMemoryRecordId: record.id,
      recommendationId: recommendation.id,
      predictedAction,
      predictedConfidence: 80,
      predictedAt: predictedAt || new Date(Date.now() - 25 * 60 * 60 * 1000),
    },
  });
  return { recommendation, prediction };
}

test.beforeEach(async () => {
  await truncateAll();
});

test("computeDirectionCorrect: BUY is correct only when price rose, EXIT/REDUCE only when price fell", () => {
  assert.equal(outcomeGradingService.computeDirectionCorrect("BUY", 5), true);
  assert.equal(outcomeGradingService.computeDirectionCorrect("BUY", -5), false);
  assert.equal(outcomeGradingService.computeDirectionCorrect("EXIT", -5), true);
  assert.equal(outcomeGradingService.computeDirectionCorrect("EXIT", 5), false);
  assert.equal(outcomeGradingService.computeDirectionCorrect("REDUCE", -1), true);
  assert.equal(outcomeGradingService.computeDirectionCorrect("BUY", NaN), null);
});

test("gradePendingOutcomes grades a BUY prediction correct when the live quote is higher than entry, honest UNGRADEABLE when no quote is available", async () => {
  const { recommendation, prediction } = await createGradablePrediction({ recommendationOverrides: { evidence: { currentPrice: 100 } } });

  const originalGetQuote = finnhubService.getQuote;
  finnhubService.getQuote = async () => ({ quote: { price: 110 } });

  try {
    const result = await outcomeGradingService.gradePendingOutcomes();
    assert.equal(result.graded, 1);

    const outcomes = await worldMemoryRepository.listOutcomesForRecord(prediction.id);
    assert.equal(outcomes.length, 1);
    assert.equal(outcomes[0].directionCorrect, true);
    assert.equal(outcomes[0].gradeLabel === "CORRECT" || outcomes[0].gradeLabel === "PARTIALLY_CORRECT", true);
    assert.equal(Number(outcomes[0].windowStartPrice), 100);
    assert.equal(Number(outcomes[0].windowEndPrice), 110);
  } finally {
    finnhubService.getQuote = originalGetQuote;
  }
});

test("gradePendingOutcomes writes an honest UNGRADEABLE outcome when no live quote is available, never fabricating a return", async () => {
  const { prediction } = await createGradablePrediction();

  const originalGetQuote = finnhubService.getQuote;
  finnhubService.getQuote = async () => {
    throw new Error("no API key configured");
  };

  try {
    const result = await outcomeGradingService.gradePendingOutcomes();
    assert.equal(result.graded, 1);

    const outcomes = await worldMemoryRepository.listOutcomesForRecord(prediction.id);
    assert.equal(outcomes[0].gradeLabel, "UNGRADEABLE");
    assert.equal(outcomes[0].windowReturnPct, null);
    assert.equal(outcomes[0].directionCorrect, null);
  } finally {
    finnhubService.getQuote = originalGetQuote;
  }
});

test("gradePendingOutcomes skips predictions younger than the grading window", async () => {
  await createGradablePrediction({ predictedAt: new Date() });

  const originalGetQuote = finnhubService.getQuote;
  finnhubService.getQuote = async () => ({ quote: { price: 110 } });

  try {
    const result = await outcomeGradingService.gradePendingOutcomes();
    assert.equal(result.graded, 0);
  } finally {
    finnhubService.getQuote = originalGetQuote;
  }
});

test("gradePendingOutcomes never re-grades a prediction that already has an Outcome for the window", async () => {
  const { prediction } = await createGradablePrediction();

  const originalGetQuote = finnhubService.getQuote;
  finnhubService.getQuote = async () => ({ quote: { price: 110 } });

  try {
    const first = await outcomeGradingService.gradePendingOutcomes();
    assert.equal(first.graded, 1);

    const second = await outcomeGradingService.gradePendingOutcomes();
    assert.equal(second.graded, 0, "already-graded predictions must not be graded again");

    const outcomes = await worldMemoryRepository.listOutcomesForRecord(prediction.id);
    assert.equal(outcomes.length, 1);
  } finally {
    finnhubService.getQuote = originalGetQuote;
  }
});
