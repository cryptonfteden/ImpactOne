require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const autonomousRecommendationRepository = require("./autonomousRecommendationRepository");
const betaUserRepository = require("./betaUserRepository");

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
    timeHorizon: "1-3 months",
    explanation: { thesis: "Buy NVDA: AI capex tailwind.", supportingEvidence: [], opposingEvidence: [], keyRisks: [], invalidationConditions: [], timeHorizon: "1-3 months", affectedPositions: [], affectedWatchlistSymbols: [], confidenceDrivers: [], confidenceReducers: [] },
    scenarios: [
      { case: "bull", narrative: "n", probability: 0.3, priceImpact: "15-22%", portfolioImpact: null, catalysts: [], risks: [], invalidationTrigger: "x" },
      { case: "base", narrative: "n", probability: 0.5, priceImpact: "4-9%", portfolioImpact: null, catalysts: [], risks: [], invalidationTrigger: "x" },
      { case: "bear", narrative: "n", probability: 0.2, priceImpact: "-7% tactical stop", portfolioImpact: null, catalysts: [], risks: [], invalidationTrigger: "x" },
    ],
    qualityScore: 75,
    qualityComponents: { sourceQuality: 80, evidenceFreshness: 70, portfolioRelevance: 40, evidenceAgreement: 100, dataCompleteness: 75, modelConfidence: 90 },
    ...overrides,
  };
}

function baseTraceData(recommendationId, overrides = {}) {
  return {
    recommendationId,
    inputEvidence: { rankingItem: { symbol: "NVDA" }, matchedEvents: [], portfolioSnapshot: null, macroRegime: null },
    rankingResult: { convictionScore: 90, action: "BUY" },
    confidenceCalculation: { qualityScore: 75, qualityComponents: {} },
    finalOutput: { action: "BUY", expectedUpside: "15-22%" },
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

test("createDecisionTrace persists and getDecisionTraceByRecommendationId retrieves it", async () => {
  const recommendation = await autonomousRecommendationRepository.createRecommendation(baseData());
  const trace = await autonomousRecommendationRepository.createDecisionTrace(baseTraceData(recommendation.id));

  const fetched = await autonomousRecommendationRepository.getDecisionTraceByRecommendationId(recommendation.id);
  assert.equal(fetched.id, trace.id);
  assert.equal(fetched.rankingResult.action, "BUY");
  assert.equal(fetched.finalOutput.expectedUpside, "15-22%");
});

test("Sprint 18A fields (committeeDebate, evidenceReferences, modelVersionMetadata) persist and read back correctly", async () => {
  const recommendation = await autonomousRecommendationRepository.createRecommendation(baseData());
  const trace = await autonomousRecommendationRepository.createDecisionTrace(
    baseTraceData(recommendation.id, {
      committeeDebate: { expertVotes: [{ agent: "Equity Analyst", vote: "Buy", confidence: 70 }], consensusLevel: 80, disagreementLevel: 20 },
      evidenceReferences: [{ eventId: "abc123", eventType: "ai", sourceType: "news", symbols: ["NVDA"] }],
      modelVersionMetadata: { eventEnvelopeVersion: "1.0.0", contractVersion: "1.0.0" },
    })
  );

  const fetched = await autonomousRecommendationRepository.getDecisionTraceByRecommendationId(recommendation.id);
  assert.equal(fetched.id, trace.id);
  assert.equal(fetched.committeeDebate.consensusLevel, 80);
  assert.equal(fetched.evidenceReferences[0].eventId, "abc123");
  assert.equal(fetched.modelVersionMetadata.contractVersion, "1.0.0");
});

test("Sprint 18A fields default to null for a trace created without them (backward compatible with pre-Sprint-18A callers)", async () => {
  const recommendation = await autonomousRecommendationRepository.createRecommendation(baseData());
  await autonomousRecommendationRepository.createDecisionTrace(baseTraceData(recommendation.id));

  const fetched = await autonomousRecommendationRepository.getDecisionTraceByRecommendationId(recommendation.id);
  assert.equal(fetched.committeeDebate, null);
  assert.equal(fetched.evidenceReferences, null);
  assert.equal(fetched.modelVersionMetadata, null);
});

test("getDecisionTraceByRecommendationId returns null when no trace exists", async () => {
  const recommendation = await autonomousRecommendationRepository.createRecommendation(baseData());
  const fetched = await autonomousRecommendationRepository.getDecisionTraceByRecommendationId(recommendation.id);
  assert.equal(fetched, null);
});

test("deleting a recommendation cascades to its decision trace", async () => {
  const recommendation = await autonomousRecommendationRepository.createRecommendation(baseData());
  await autonomousRecommendationRepository.createDecisionTrace(baseTraceData(recommendation.id));

  const { getPrismaClient } = require("../db/prismaClient");
  const prisma = getPrismaClient();
  await prisma.recommendation.delete({ where: { id: recommendation.id } });

  const fetched = await autonomousRecommendationRepository.getDecisionTraceByRecommendationId(recommendation.id);
  assert.equal(fetched, null);
});

test("the repository exposes no update method for decision traces (immutable by convention)", () => {
  const exportedNames = Object.keys(autonomousRecommendationRepository);
  const hasTraceUpdateMethod = exportedNames.some((name) => /decisiontrace/i.test(name) && /update/i.test(name));
  assert.equal(hasTraceUpdateMethod, false, "no updateDecisionTrace-style export should ever exist");
});

test("Sprint 29 — expireStaleRecommendations transitions ACTIVE recommendations past their expiresAt to EXPIRED, never a delete", async () => {
  const past = await autonomousRecommendationRepository.createRecommendation(baseData({ expiresAt: new Date(Date.now() - 1000) }));
  const future = await autonomousRecommendationRepository.createRecommendation(baseData({ symbol: "AAPL", expiresAt: new Date(Date.now() + 1000 * 60 * 60) }));
  const noExpiry = await autonomousRecommendationRepository.createRecommendation(baseData({ symbol: "TSLA" }));

  await autonomousRecommendationRepository.expireStaleRecommendations();

  assert.equal((await autonomousRecommendationRepository.getById(past.id)).status, "EXPIRED");
  assert.equal((await autonomousRecommendationRepository.getById(future.id)).status, "ACTIVE");
  assert.equal((await autonomousRecommendationRepository.getById(noExpiry.id)).status, "ACTIVE");
});

test("Sprint 29 — createFeedback and listFeedbackForRecommendation round-trip real feedback, oldest-last", async () => {
  const recommendation = await autonomousRecommendationRepository.createRecommendation(baseData());

  await autonomousRecommendationRepository.createFeedback({ recommendationId: recommendation.id, feedbackType: "USEFUL" });
  await autonomousRecommendationRepository.createFeedback({ recommendationId: recommendation.id, feedbackType: "TOO_EARLY" });

  const feedback = await autonomousRecommendationRepository.listFeedbackForRecommendation(recommendation.id);
  assert.equal(feedback.length, 2);
  assert.equal(feedback[0].feedbackType, "TOO_EARLY", "most recent feedback should come first");
  assert.equal(feedback[1].feedbackType, "USEFUL");
});

test("Sprint 29 — a changed mind creates a new feedback row rather than editing the old one (no update method exists)", () => {
  const exportedNames = Object.keys(autonomousRecommendationRepository);
  const hasFeedbackUpdateMethod = exportedNames.some((name) => /feedback/i.test(name) && /update/i.test(name));
  assert.equal(hasFeedbackUpdateMethod, false, "no updateFeedback-style export should ever exist");
});

// Phase PERSONALIZATION-PRIVACY-001 — listAllFeedback's betaUserId is
// intentionally optional (see the function's own code comment): omitted,
// it must keep its legitimate platform-wide behavior (learningLoopService/
// qualityDashboardService's internal, non-personal aggregate); passed, it
// must scope strictly to that one real user's own feedback.
test("Phase PERSONALIZATION-PRIVACY-001 — listAllFeedback stays a global aggregate when no betaUserId is given, and scopes strictly when one is", async () => {
  const inviteCodeA = "TEST-AUTONOMOUS-RECOMMENDATION-REPOSITORY-001-A";
  const inviteCodeB = "TEST-AUTONOMOUS-RECOMMENDATION-REPOSITORY-001-B";
  const existingA = await betaUserRepository.findByInviteCode(inviteCodeA);
  const userA = existingA || (await betaUserRepository.createBetaUser({ label: "User A", inviteCode: inviteCodeA }));
  const existingB = await betaUserRepository.findByInviteCode(inviteCodeB);
  const userB = existingB || (await betaUserRepository.createBetaUser({ label: "User B", inviteCode: inviteCodeB }));

  const recommendation = await autonomousRecommendationRepository.createRecommendation(baseData());
  await autonomousRecommendationRepository.createFeedback({ recommendationId: recommendation.id, feedbackType: "USEFUL", betaUserId: userA.id });
  await autonomousRecommendationRepository.createFeedback({ recommendationId: recommendation.id, feedbackType: "TOO_EARLY", betaUserId: userB.id });

  const global = await autonomousRecommendationRepository.listAllFeedback();
  assert.equal(global.length, 2, "omitting betaUserId must still return every user's feedback (the legitimate internal/global use)");

  const onlyUserA = await autonomousRecommendationRepository.listAllFeedback({ betaUserId: userA.id });
  assert.equal(onlyUserA.length, 1);
  assert.equal(onlyUserA[0].feedbackType, "USEFUL", "passing betaUserId must return only that user's own feedback, never User B's");
});
