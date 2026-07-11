require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const autonomousRecommendationRepository = require("./autonomousRecommendationRepository");

function baseData(overrides = {}) {
  return {
    symbol: "NVDA",
    action: "BUY",
    confidenceScore: 90,
    expectedUpside: "15-22%",
    expectedDownside: "-7% tactical stop",
    riskScore: 40,
    riskLabel: "Moderate",
    positionSizeSuggestion: "4-6%",
    reasoning: "Strong AI capex tailwind.",
    evidence: { overallAiScore: 88 },
    portfolioContext: null,
    ...overrides,
  };
}

test.beforeEach(async () => {
  await truncateAll();
});

test("createRecommendation persists and getById retrieves it", async () => {
  const created = await autonomousRecommendationRepository.createRecommendation(baseData());
  const fetched = await autonomousRecommendationRepository.getById(created.id);
  assert.equal(fetched.symbol, "NVDA");
  assert.equal(fetched.status, "ACTIVE");
  assert.equal(fetched.evidence.overallAiScore, 88);
});

test("listActive returns only ACTIVE recommendations, most recent first", async () => {
  await autonomousRecommendationRepository.createRecommendation(baseData({ symbol: "AAPL" }));
  const second = await autonomousRecommendationRepository.createRecommendation(baseData({ symbol: "TSLA" }));
  await autonomousRecommendationRepository.supersedeActiveForSymbol("AAPL", second.id);

  const active = await autonomousRecommendationRepository.listActive();
  assert.equal(active.length, 1);
  assert.equal(active[0].symbol, "TSLA");
});

test("listAll filters by status and symbol", async () => {
  const first = await autonomousRecommendationRepository.createRecommendation(baseData({ symbol: "NVDA" }));
  const second = await autonomousRecommendationRepository.createRecommendation(baseData({ symbol: "NVDA" }));
  await autonomousRecommendationRepository.supersedeActiveForSymbol("NVDA", second.id);

  const superseded = await autonomousRecommendationRepository.listAll({ status: "SUPERSEDED" });
  assert.equal(superseded.length, 1);
  assert.equal(superseded[0].id, first.id);

  const bySymbol = await autonomousRecommendationRepository.listAll({ symbol: "NVDA" });
  assert.equal(bySymbol.length, 2);
});

test("supersedeActiveForSymbol is a no-op when there is nothing to supersede", async () => {
  const created = await autonomousRecommendationRepository.createRecommendation(baseData());
  const result = await autonomousRecommendationRepository.supersedeActiveForSymbol("NVDA", created.id);
  assert.equal(result.count, 0);
  const fetched = await autonomousRecommendationRepository.getById(created.id);
  assert.equal(fetched.status, "ACTIVE");
});

test("createRunLog and getLatestRunLog", async () => {
  await autonomousRecommendationRepository.createRunLog({ symbolsEvaluated: 3, recommendationsGenerated: 1, errors: null });
  const latest = await autonomousRecommendationRepository.createRunLog({ symbolsEvaluated: 5, recommendationsGenerated: 2, errors: null });

  const fetched = await autonomousRecommendationRepository.getLatestRunLog();
  assert.equal(fetched.id, latest.id);
  assert.equal(fetched.symbolsEvaluated, 5);
});
