require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../../test/dbHelpers");
const autonomousRecommendationRepository = require("../autonomousRecommendationRepository");
const worldMemoryRepository = require("../worldMemoryRepository");
const datasetValidatorService = require("./datasetValidatorService");
const datasetQualityReportService = require("./datasetQualityReportService");

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
    explanation: {},
    scenarios: [],
    qualityScore: 75,
    qualityComponents: {},
    ...overrides,
  };
}

const REAL_COMMITTEE = {
  members: [{ memberId: "technicalAnalyst", memberName: "Technical Analyst", headline: "h", reasoning: "r", supportingEvidence: [{ category: "TECHNICAL", reason: "x" }], counterEvidence: [], confidence: 70, uncertainty: 30, freshness: "CURRENT", missingEvidence: [], isRecommendation: false }],
  agreement: { status: "AGREEMENT", direction: "SUPPORTIVE", members: ["technicalAnalyst"] },
  disagreement: { status: "NO_DISAGREEMENT", supportiveMembers: [], contraryMembers: [] },
  strongestSupportingEvidence: null,
  strongestContradictoryEvidence: null,
  missingEvidence: [],
  staleEvidence: [],
  isVerdict: false,
};

const REAL_EVIDENCE_MATRIX_SNAPSHOT = {
  symbol: "NVDA",
  generatedAt: new Date().toISOString(),
  categories: [{ category: "TECHNICAL", stance: "SUPPORTIVE", confidence: 70, uncertainty: 30, sourceCount: 1, newestSource: null, strongestCounterEvidence: null }],
};

test.beforeEach(async () => {
  await truncateAll();
});

test("validateRecommendation returns INVALID for a recommendation with no DecisionTrace — no orphan tolerance", async () => {
  const recommendation = await autonomousRecommendationRepository.createRecommendation(recommendationData());
  const result = await datasetValidatorService.validateRecommendation(recommendation.id);
  assert.equal(result.status, "INVALID");
});

test("validateRecommendation returns UNKNOWN for a recommendation still within its grading window — pending is not a defect", async () => {
  const recommendation = await autonomousRecommendationRepository.createRecommendation(recommendationData());
  await autonomousRecommendationRepository.createDecisionTrace({ recommendationId: recommendation.id, inputEvidence: {}, rankingResult: {}, confidenceCalculation: {}, finalOutput: {} });
  const result = await datasetValidatorService.validateRecommendation(recommendation.id);
  assert.equal(result.status, "UNKNOWN");
});

test("validateRecommendation returns CONTAMINATED for a graded outcome whose DecisionTrace has no unified committee data", async () => {
  const recommendation = await autonomousRecommendationRepository.createRecommendation(recommendationData());
  await autonomousRecommendationRepository.createDecisionTrace({ recommendationId: recommendation.id, inputEvidence: {}, rankingResult: {}, confidenceCalculation: {}, finalOutput: {} });
  await worldMemoryRepository.createOutcome({
    recommendationId: recommendation.id, symbol: "NVDA", action: "BUY", timeWindow: "D1", windowStartPrice: 100, windowEndPrice: 110, windowReturnPct: 10,
    directionCorrect: true, grade: 60, gradeLabel: "CORRECT", methodologyVersion: "test-v1", dataSourceSnapshot: {}, benchmarkSymbol: "SPY", benchmarkReturnPct: 2,
  });

  const result = await datasetValidatorService.validateRecommendation(recommendation.id);
  assert.equal(result.status, "CONTAMINATED");
});

test("validateRecommendation returns INVALID for an UNGRADEABLE outcome — no real win/loss signal", async () => {
  const recommendation = await autonomousRecommendationRepository.createRecommendation(recommendationData());
  await autonomousRecommendationRepository.createDecisionTrace({ recommendationId: recommendation.id, inputEvidence: {}, rankingResult: {}, confidenceCalculation: {}, finalOutput: {}, committeeDebate: { committee: REAL_COMMITTEE, cio: {} } });
  await worldMemoryRepository.createOutcome({
    recommendationId: recommendation.id, symbol: "NVDA", action: "BUY", timeWindow: "D1", windowStartPrice: 100,
    gradeLabel: "UNGRADEABLE", ungradeableReason: "No live quote available.", methodologyVersion: "test-v1", dataSourceSnapshot: {},
  });

  const result = await datasetValidatorService.validateRecommendation(recommendation.id);
  assert.equal(result.status, "INVALID");
});

test("validateRecommendation returns PARTIAL when core fields are present but honestly-nullable ones (sector, regime) are missing", async () => {
  const recommendation = await autonomousRecommendationRepository.createRecommendation(recommendationData());
  await autonomousRecommendationRepository.createDecisionTrace({
    recommendationId: recommendation.id, inputEvidence: {}, rankingResult: {}, confidenceCalculation: {}, finalOutput: {},
    committeeDebate: { committee: REAL_COMMITTEE, cio: {} },
    regimeSnapshot: { regime: "UNKNOWN", rulesetVersion: "d1-v1", inputs: {} },
    evidenceMatrixSnapshot: REAL_EVIDENCE_MATRIX_SNAPSHOT,
  });
  await worldMemoryRepository.createOutcome({
    recommendationId: recommendation.id, symbol: "NVDA", action: "BUY", timeWindow: "D1", windowStartPrice: 100, windowEndPrice: 110, windowReturnPct: 10,
    directionCorrect: true, grade: 60, gradeLabel: "CORRECT", methodologyVersion: "test-v1", dataSourceSnapshot: {}, benchmarkSymbol: "SPY", benchmarkReturnPct: 2, benchmarkVersion: "d1-v1", performanceMetrics: { maxDrawdownPct: -1 },
  });

  const result = await datasetValidatorService.validateRecommendation(recommendation.id);
  assert.equal(result.status, "PARTIAL");
  assert.ok(result.reasons.some((reason) => reason.includes("sector")));
  assert.ok(result.reasons.some((reason) => reason.includes("regime")));
});

test("validateRecommendation returns READY when every field is genuinely complete", async () => {
  const recommendation = await autonomousRecommendationRepository.createRecommendation(recommendationData({ portfolioContext: { sector: "Technology", quantity: 1, marketValue: 100, unrealizedPnlPct: 0, weightPct: 1 } }));
  await autonomousRecommendationRepository.createDecisionTrace({
    recommendationId: recommendation.id, inputEvidence: {}, rankingResult: {}, confidenceCalculation: {}, finalOutput: {},
    committeeDebate: { committee: REAL_COMMITTEE, cio: {} },
    regimeSnapshot: { regime: "BULL_TREND_LOW_VOL", rulesetVersion: "d1-v1", inputs: {} },
    evidenceMatrixSnapshot: REAL_EVIDENCE_MATRIX_SNAPSHOT,
  });
  await worldMemoryRepository.createOutcome({
    recommendationId: recommendation.id, symbol: "NVDA", action: "BUY", timeWindow: "D1", windowStartPrice: 100, windowEndPrice: 110, windowReturnPct: 10,
    directionCorrect: true, grade: 60, gradeLabel: "CORRECT", methodologyVersion: "test-v1", dataSourceSnapshot: {}, benchmarkSymbol: "SPY", benchmarkReturnPct: 2, benchmarkVersion: "d1-v1", performanceMetrics: { maxDrawdownPct: -1 },
  });

  const result = await datasetValidatorService.validateRecommendation(recommendation.id);
  assert.equal(result.status, "READY");
  assert.deepEqual(result.reasons, []);
});

test("generateDatasetQualityReport computes real, honest coverage percentages over the actual dataset", async () => {
  const ready = await autonomousRecommendationRepository.createRecommendation(recommendationData({ portfolioContext: { sector: "Technology", quantity: 1, marketValue: 100, unrealizedPnlPct: 0, weightPct: 1 } }));
  await autonomousRecommendationRepository.createDecisionTrace({
    recommendationId: ready.id, inputEvidence: {}, rankingResult: {}, confidenceCalculation: {}, finalOutput: {},
    committeeDebate: { committee: REAL_COMMITTEE, cio: {} },
    regimeSnapshot: { regime: "BULL_TREND_LOW_VOL", rulesetVersion: "d1-v1", inputs: {} },
    evidenceMatrixSnapshot: REAL_EVIDENCE_MATRIX_SNAPSHOT,
  });
  await worldMemoryRepository.createOutcome({
    recommendationId: ready.id, symbol: "NVDA", action: "BUY", timeWindow: "D1", windowStartPrice: 100, windowEndPrice: 110, windowReturnPct: 10,
    directionCorrect: true, grade: 60, gradeLabel: "CORRECT", methodologyVersion: "test-v1", dataSourceSnapshot: {}, benchmarkSymbol: "SPY", benchmarkReturnPct: 2, benchmarkVersion: "d1-v1", performanceMetrics: { maxDrawdownPct: -1 },
  });

  const pending = await autonomousRecommendationRepository.createRecommendation(recommendationData());
  await autonomousRecommendationRepository.createDecisionTrace({ recommendationId: pending.id, inputEvidence: {}, rankingResult: {}, confidenceCalculation: {}, finalOutput: {} });

  const report = await datasetQualityReportService.generateDatasetQualityReport();
  assert.equal(report.totalRecommendations, 2);
  assert.equal(report.statusCounts.READY, 1);
  assert.equal(report.statusCounts.UNKNOWN, 1);
  assert.ok(Number.isFinite(report.benchmarkCoveragePct));
  assert.ok(Number.isFinite(report.completionPct));
});

test("generateDatasetQualityReport is honestly all-null when the dataset is completely empty — never a fabricated 100%", async () => {
  const report = await datasetQualityReportService.generateDatasetQualityReport();
  assert.equal(report.totalRecommendations, 0);
  assert.equal(report.completionPct, null);
  assert.equal(report.benchmarkCoveragePct, null);
});
