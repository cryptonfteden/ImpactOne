// Sprint 39 — Explainability Layer unit + integration tests.
require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../../test/dbHelpers");
const { buildProvenance } = require("./provenanceService");
const { classifyDisagreement } = require("./disagreementEngine");
const { checkConsistency } = require("./consistencyCheckService");
const { explainRecommendation } = require("./recommendationExplanationService");
const whatIfService = require("./whatIfService");
const decisionTraceExplainabilityService = require("./decisionTraceExplainabilityService");
const autonomousRecommendationRepository = require("../autonomousRecommendationRepository");
const technicalIntelligenceService = require("../intelligence/technicalIntelligenceService");
const worldMemoryRepository = require("../worldMemoryRepository");
const recommendationLifecycleService = require("../qualityPlatform/recommendationLifecycleService");

test.beforeEach(async () => {
  await truncateAll();
});

function member({ memberId, supportingEvidence = [], counterEvidence = [], confidence = 50, uncertainty = 50, freshness = "CURRENT", missingEvidence = [] }) {
  return { memberId, memberName: memberId, headline: "h", reasoning: "r", supportingEvidence, counterEvidence, confidence, uncertainty, freshness, missingEvidence, isRecommendation: false };
}

test("provenanceService: never invents a provider — every field is read directly off the matrix row", () => {
  const matrix = {
    symbol: "NVDA",
    generatedAt: "2026-07-20T00:00:00.000Z",
    categories: [
      { category: "TECHNICAL", stance: "SUPPORTIVE", confidence: 70, uncertainty: 30, sourceCount: 1, newestSource: "2026-07-19", isStale: false, isFixture: undefined },
      { category: "SOCIAL", stance: "NEUTRAL", confidence: 20, uncertainty: 80, sourceCount: 2, newestSource: null, isFixture: true },
      { category: "COT", stance: "UNAVAILABLE", confidence: 0, uncertainty: 100, sourceCount: 0, newestSource: null, reason: "not applicable" },
    ],
  };
  const provenance = buildProvenance(matrix);
  assert.equal(provenance.length, 3);
  assert.equal(provenance[0].status, "LIVE");
  assert.equal(provenance[0].freshness, "CURRENT");
  assert.equal(provenance[1].status, "FIXTURE");
  assert.equal(provenance[2].status, "UNAVAILABLE");
  assert.equal(provenance[2].freshness, "UNKNOWN");
  for (const record of provenance) {
    assert.ok(record.evidenceId.includes("NVDA"));
    assert.equal(record.retrievalTimestamp, matrix.generatedAt);
  }
});

test("provenanceService: stale evidence is never reported as live/current", () => {
  const matrix = {
    symbol: "AAPL",
    generatedAt: "2026-07-20T00:00:00.000Z",
    categories: [{ category: "TECHNICAL", stance: "SUPPORTIVE", confidence: 60, uncertainty: 40, sourceCount: 1, newestSource: "2026-06-01", isStale: true }],
  };
  const provenance = buildProvenance(matrix);
  assert.equal(provenance[0].freshness, "STALE");
});

test("disagreementEngine: unanimous supportive members classify as AGREEMENT", () => {
  const summary = { members: [member({ memberId: "a", supportingEvidence: [{}] }), member({ memberId: "b", supportingEvidence: [{}] })] };
  const result = classifyDisagreement(summary);
  assert.equal(result.level, "AGREEMENT");
});

test("disagreementEngine: split members classify as STRONG_DISAGREEMENT with real pairwise reasons, never fabricated", () => {
  const summary = {
    members: [
      member({ memberId: "a", supportingEvidence: [{}], freshness: "STALE" }),
      member({ memberId: "b", counterEvidence: [{}], freshness: "CURRENT" }),
    ],
  };
  const result = classifyDisagreement(summary);
  assert.equal(result.level, "STRONG_DISAGREEMENT");
  assert.equal(result.pairs.length, 1);
  assert.equal(result.pairs[0].reason, "FRESHNESS");
});

test("disagreementEngine: all-neutral members (no evidence) classify as INSUFFICIENT_EVIDENCE", () => {
  const summary = { members: [member({ memberId: "a" }), member({ memberId: "b" })] };
  const result = classifyDisagreement(summary);
  assert.equal(result.level, "INSUFFICIENT_EVIDENCE");
});

test("disagreementEngine: a member with both supporting and counter evidence contributes CONFLICTING_EVIDENCE", () => {
  const summary = { members: [member({ memberId: "a", supportingEvidence: [{}], counterEvidence: [{}] })] };
  const result = classifyDisagreement(summary);
  assert.equal(result.level, "CONFLICTING_EVIDENCE");
  assert.deepEqual(result.mixedMembers, ["a"]);
});

test("consistencyCheckService: BUY with a supportive committee is consistent", () => {
  const committeeSummary = { agreement: { status: "AGREEMENT", direction: "SUPPORTIVE" }, disagreement: { status: "NO_DISAGREEMENT" } };
  const result = checkConsistency({ recommendationAction: "BUY", committeeSummary });
  assert.equal(result.consistent, true);
  assert.equal(result.mismatchExplanation, null);
});

test("consistencyCheckService: BUY with a contrary committee is flagged, never hidden", () => {
  const committeeSummary = { agreement: { status: "AGREEMENT", direction: "CONTRARY" }, disagreement: { status: "NO_DISAGREEMENT" } };
  const result = checkConsistency({ recommendationAction: "BUY", committeeSummary });
  assert.equal(result.consistent, false);
  assert.ok(result.mismatchExplanation.includes("BUY"));
  assert.ok(result.mismatchExplanation.includes("contrary"));
});

test("consistencyCheckService: BUY with a split committee names the real supportive/contrary members, never a vague message", () => {
  const committeeSummary = { agreement: { status: "NO_CLEAR_AGREEMENT" }, disagreement: { status: "DISAGREEMENT", supportiveMembers: ["technicalAnalyst"], contraryMembers: ["equityResearchSpecialist"] } };
  const result = checkConsistency({ recommendationAction: "BUY", committeeSummary });
  assert.equal(result.consistent, false);
  assert.ok(result.mismatchExplanation.includes("technicalAnalyst"));
  assert.ok(result.mismatchExplanation.includes("equityResearchSpecialist"));
});

test("recommendationExplanationService: every field traces back to real recommendation/committee data, never a placeholder", () => {
  const recommendation = { action: "BUY", reasoning: "Real reasoning text.", confidenceScore: 72, riskScore: 40, riskLabel: "Moderate", expectedDownside: "-8%" };
  const committeeSummary = {
    members: [member({ memberId: "technicalAnalyst", supportingEvidence: [{ category: "TECHNICAL", reason: "uptrend" }], confidence: 70 })],
    strongestSupportingEvidence: { memberId: "technicalAnalyst", category: "TECHNICAL", reason: "uptrend", memberConfidence: 70 },
    strongestContradictoryEvidence: null,
    missingEvidence: [{ memberId: "institutionalSpecialist", item: "INSTITUTIONS: not configured" }],
  };
  const explanation = explainRecommendation({ recommendation, committeeSummary });
  assert.equal(explanation.whyAction, "Real reasoning text.");
  assert.ok(explanation.whyNot.EXIT);
  assert.ok(explanation.whyNot.HOLD);
  assert.equal(explanation.evidenceMatteredMost.reason, "uptrend");
  assert.equal(explanation.missingEvidence.length, 1);
  assert.ok(explanation.singleFactThatWouldChangeThis.includes("INSTITUTIONS"));
});

test("recommendationExplanationService: refuses to explain a null recommendation rather than fabricating one", () => {
  assert.throws(() => explainRecommendation({ recommendation: null, committeeSummary: null }));
});

test("whatIfService: removing a category never fabricates other categories' evidence and reports a real before/after lean", async () => {
  const originalAnalyzeSymbol = technicalIntelligenceService.analyzeSymbol;
  technicalIntelligenceService.analyzeSymbol = async () => ({ enoughDataStatus: "INSUFFICIENT", signals: {} });
  try {
    const result = await whatIfService.runWhatIf("NVDA", "TECHNICAL");
    assert.equal(result.excludedCategory, "TECHNICAL");
    assert.ok(["true", "false"].includes(String(result.verdictChanged)));
    assert.equal(result.isVerdict, false);
  } finally {
    technicalIntelligenceService.analyzeSymbol = originalAnalyzeSymbol;
  }
});

test("whatIfService requires an excludeCategory rather than silently no-op-ing", async () => {
  await assert.rejects(() => whatIfService.runWhatIf("NVDA", null));
});

test("decisionTraceExplainabilityService: refuses to fabricate a trace for an unknown recommendation id (no orphan recommendation)", async () => {
  await assert.rejects(() => decisionTraceExplainabilityService.explainRecommendationById("does-not-exist"), (error) => error.status === 404);
});

test("decisionTraceExplainabilityService: refuses to fabricate a trace for a real recommendation with no DecisionTrace row", async () => {
  const recommendation = await autonomousRecommendationRepository.createRecommendation({
    symbol: "NVDA",
    action: "BUY",
    confidenceScore: 70,
    expectedUpside: "10%",
    expectedDownside: "-5%",
    riskScore: 30,
    riskLabel: "Moderate",
    positionSizeSuggestion: "2%",
    reasoning: "Test reasoning",
    evidence: {},
    explanation: {},
    scenarios: {},
    qualityScore: 60,
    qualityComponents: {},
  });
  await assert.rejects(() => decisionTraceExplainabilityService.explainRecommendationById(recommendation.id), (error) => error.status === 404);
});

test("decisionTraceExplainabilityService: assembles a full, real explainability bundle for a recommendation with a real DecisionTrace", async () => {
  const originalAnalyzeSymbol = technicalIntelligenceService.analyzeSymbol;
  technicalIntelligenceService.analyzeSymbol = async () => ({ enoughDataStatus: "INSUFFICIENT", signals: {} });
  try {
    const recommendation = await autonomousRecommendationRepository.createRecommendation({
      symbol: "NVDA",
      action: "BUY",
      confidenceScore: 70,
      expectedUpside: "10%",
      expectedDownside: "-5%",
      riskScore: 30,
      riskLabel: "Moderate",
      positionSizeSuggestion: "2%",
      reasoning: "Test reasoning",
      evidence: {},
      explanation: {},
      scenarios: {},
      qualityScore: 60,
      qualityComponents: {},
    });
    await autonomousRecommendationRepository.createDecisionTrace({
      recommendationId: recommendation.id,
      inputEvidence: { rankingItem: {} },
      rankingResult: { action: "BUY" },
      confidenceCalculation: { uncertainty: 35 },
      finalOutput: { action: "BUY" },
    });

    const bundle = await decisionTraceExplainabilityService.explainRecommendationById(recommendation.id);
    assert.equal(bundle.recommendationId, recommendation.id);
    assert.equal(bundle.symbol, "NVDA");
    assert.equal(bundle.liveCommittee.members.length, 8);
    assert.equal(bundle.isVerdict, false);
    assert.ok(bundle.consistency);
    assert.ok(bundle.disagreement);
    assert.ok(bundle.explanation);
    assert.equal(bundle.provenance.length, 10);
    assert.equal(bundle.uncertainty, 35);
    // Sprint 42 — Explainability History: honest, not fabricated, when
    // nothing has happened yet.
    assert.equal(bundle.finalOutcome, null);
    assert.deepEqual(bundle.lifecycle.events, []);
    assert.equal(bundle.lifecycle.currentState, null);
  } finally {
    technicalIntelligenceService.analyzeSymbol = originalAnalyzeSymbol;
  }
});

test("Sprint 42 — decisionTraceExplainabilityService includes the real final outcome and real lifecycle history once they exist, never rewriting the immutable trace", async () => {
  const originalAnalyzeSymbol = technicalIntelligenceService.analyzeSymbol;
  technicalIntelligenceService.analyzeSymbol = async () => ({ enoughDataStatus: "INSUFFICIENT", signals: {} });
  try {
    const recommendation = await autonomousRecommendationRepository.createRecommendation({
      symbol: "NVDA",
      action: "BUY",
      confidenceScore: 70,
      expectedUpside: "10%",
      expectedDownside: "-5%",
      riskScore: 30,
      riskLabel: "Moderate",
      positionSizeSuggestion: "2%",
      reasoning: "Test reasoning",
      evidence: {},
      explanation: {},
      scenarios: {},
      qualityScore: 60,
      qualityComponents: {},
    });
    await autonomousRecommendationRepository.createDecisionTrace({
      recommendationId: recommendation.id,
      inputEvidence: {},
      rankingResult: {},
      confidenceCalculation: {},
      finalOutput: {},
    });

    await recommendationLifecycleService.recordTransition({ recommendationId: recommendation.id, state: "GENERATED" });
    await recommendationLifecycleService.recordTransition({ recommendationId: recommendation.id, state: "SUCCEEDED" });

    await worldMemoryRepository.createOutcome({
      recommendationId: recommendation.id,
      symbol: "NVDA",
      action: "BUY",
      timeWindow: "D1",
      windowStartPrice: 100,
      windowEndPrice: 110,
      windowReturnPct: 10,
      directionCorrect: true,
      grade: 60,
      gradeLabel: "CORRECT",
      methodologyVersion: "test-v1",
      dataSourceSnapshot: {},
    });

    const bundle = await decisionTraceExplainabilityService.explainRecommendationById(recommendation.id);
    assert.equal(bundle.finalOutcome.gradeLabel, "CORRECT");
    assert.equal(Number(bundle.finalOutcome.windowReturnPct), 10);
    assert.deepEqual(bundle.lifecycle.events.map((event) => event.state), ["GENERATED", "SUCCEEDED"]);
    assert.equal(bundle.lifecycle.currentState, "SUCCEEDED");
  } finally {
    technicalIntelligenceService.analyzeSymbol = originalAnalyzeSymbol;
  }
});
