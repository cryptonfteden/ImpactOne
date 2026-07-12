require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const { truncateAll } = require("../test/dbHelpers");
const investmentCommitteeService = require("../services/investmentCommitteeService");
const autonomousRecommendationRepository = require("../services/autonomousRecommendationRepository");
const app = require("../app");

// A deliberately bearish committee debate — used to prove that even when
// the committee's raw expert opinion leans the opposite direction from a
// persisted Recommendation, the API never surfaces two conflicting verdicts.
const BEARISH_COMMITTEE_DEBATE = {
  generatedAt: new Date().toISOString(),
  eventHint: "Valuation concerns",
  supportingArguments: [],
  opposingArguments: [{ agent: "Risk Manager", argument: "Tail risk remains elevated." }],
  expertVotes: [
    { agent: "Risk Manager", vote: "Strong Sell", confidence: 80, rationale: "Tail risk remains elevated." },
    { agent: "Equity Analyst", vote: "Sell", confidence: 65, rationale: "Valuation stretched." },
  ],
  disagreementLevel: 10,
  consensusLevel: 90,
  expertsDisagree: false,
  disagreementExplanation: "Committee alignment is high enough to support a cleaner final recommendation.",
  voteBreakdown: [{ vote: "Strong Sell", count: 3 }, { vote: "Sell", count: 2 }],
  specialistObservations: [],
  synthesis: { executiveSummary: "Balance of views points to sell.", expectedReturn: "-10% to -18%", risk: "Elevated", confidence: 78 },
};

function withCommitteeMock(run) {
  const original = investmentCommitteeService.analyzeInvestmentCommittee;
  investmentCommitteeService.analyzeInvestmentCommittee = async ({ symbol }) => ({
    symbol,
    displaySymbol: symbol,
    committeeDebate: BEARISH_COMMITTEE_DEBATE,
    trackRecord: { entries: [], stats: { totalDecisions: 0, evaluatedDecisions: 0, accuracy: null, winRate: null, confidenceCalibration: null, averageReturn: 0, pendingEvaluations: 0 } },
  });

  return Promise.resolve(run()).finally(() => {
    investmentCommitteeService.analyzeInvestmentCommittee = original;
  });
}

function recommendationData(overrides = {}) {
  return {
    symbol: "NVDA",
    action: "BUY",
    confidenceScore: 88,
    expectedUpside: "15-22%",
    expectedDownside: "-7% tactical stop",
    riskScore: 30,
    riskLabel: "Low",
    positionSizeSuggestion: "4-6%",
    reasoning: "Strong AI capex tailwind.",
    evidence: { overallAiScore: 90 },
    portfolioContext: null,
    timeHorizon: "1-3 months",
    explanation: { thesis: "Buy NVDA.", supportingEvidence: [], opposingEvidence: [], keyRisks: [], invalidationConditions: [], timeHorizon: "1-3 months", affectedPositions: [], affectedWatchlistSymbols: [], confidenceDrivers: [], confidenceReducers: [] },
    scenarios: [
      { case: "bull", narrative: "n", probability: 0.3, priceImpact: "15-22%", portfolioImpact: null, catalysts: [], risks: [], invalidationTrigger: "x" },
      { case: "base", narrative: "n", probability: 0.5, priceImpact: "4-9%", portfolioImpact: null, catalysts: [], risks: [], invalidationTrigger: "x" },
      { case: "bear", narrative: "n", probability: 0.2, priceImpact: "-7%", portfolioImpact: null, catalysts: [], risks: [], invalidationTrigger: "x" },
    ],
    qualityScore: 82,
    qualityComponents: { sourceQuality: 80, evidenceFreshness: 70, portfolioRelevance: 100, evidenceAgreement: 100, dataCompleteness: 100, modelConfidence: 88 },
    ...overrides,
  };
}

test.beforeEach(async () => {
  await truncateAll();
});

test("the API never surfaces two conflicting verdicts, even when the committee's raw votes disagree with the persisted recommendation", async () => {
  await withCommitteeMock(async () => {
    await autonomousRecommendationRepository.createRecommendation(recommendationData());

    const response = await request(app).get("/api/committee/analyze?symbol=NVDA");
    assert.equal(response.status, 200);

    // Exactly one canonical action, and it comes from the persisted
    // Recommendation (BUY) — never from the bearish committee debate.
    assert.equal(response.body.relatedRecommendation.action, "BUY");
    assert.equal(response.body.canonicalVerdict.action, "BUY");
    assert.equal(response.body.canonicalVerdict.hasCanonicalRecommendation, true);

    // The committee's own bearish opinion is visible as raw expert votes...
    assert.equal(response.body.committeeDebate.expertVotes[0].vote, "Strong Sell");
    // ...but never as a decision/verdict/action field anywhere in the payload.
    const serializedDebate = JSON.stringify(response.body.committeeDebate);
    assert.ok(!serializedDebate.includes('"action"'));
    assert.ok(!serializedDebate.includes('"decision"'));
    assert.ok(!serializedDebate.includes('"verdict"'));
    assert.ok(!("action" in response.body.canonicalVerdict.committeeDebate));
  });
});

test("with no persisted recommendation yet, the committee response is exploratory only — no verdict pill implied", async () => {
  await withCommitteeMock(async () => {
    const response = await request(app).get("/api/committee/analyze?symbol=TSLA");
    assert.equal(response.status, 200);

    assert.equal(response.body.relatedRecommendation, null);
    assert.equal(response.body.canonicalVerdict.hasCanonicalRecommendation, false);
    assert.equal(response.body.canonicalVerdict.action, null);
    assert.ok(response.body.committeeDebate, "debate context should still be present for exploratory research");
  });
});

test("GET /api/v2/recommendations/:id keeps every pre-Sprint-18A field present (API compatibility)", async () => {
  const created = await autonomousRecommendationRepository.createRecommendation(recommendationData());

  const response = await request(app).get(`/api/v2/recommendations/${created.id}`);
  assert.equal(response.status, 200);

  [
    "id", "symbol", "action", "confidenceScore", "expectedUpside", "expectedDownside",
    "riskScore", "riskLabel", "positionSizeSuggestion", "reasoning", "evidence",
    "portfolioContext", "status", "timeHorizon", "explanation", "scenarios",
    "qualityScore", "qualityComponents",
  ].forEach((field) => {
    assert.ok(field in response.body, `expected pre-existing field "${field}" to still be present`);
  });
});
