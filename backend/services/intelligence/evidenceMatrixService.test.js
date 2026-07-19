require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../../test/dbHelpers");
const evidenceMatrixService = require("./evidenceMatrixService");
const technicalIntelligenceService = require("./technicalIntelligenceService");
const researchAgentService = require("../researchAgentService");

test.beforeEach(async () => {
  await truncateAll();
});

test("buildEvidenceMatrix returns exactly the 10 mission-named categories, independently, never collapsed into one score", async () => {
  const originalAnalyzeSymbol = technicalIntelligenceService.analyzeSymbol;
  technicalIntelligenceService.analyzeSymbol = async () => ({ enoughDataStatus: "INSUFFICIENT", signals: {} });

  try {
    const matrix = await evidenceMatrixService.buildEvidenceMatrix("NVDA");
    assert.equal(matrix.categories.length, 10);
    assert.deepEqual(matrix.categories.map((row) => row.category).sort(), evidenceMatrixService.MATRIX_CATEGORIES.slice().sort());
    assert.equal(matrix.isVerdict, false);
    assert.equal("score" in matrix, false);
    assert.equal("blendedConfidence" in matrix, false);
  } finally {
    technicalIntelligenceService.analyzeSymbol = originalAnalyzeSymbol;
  }
});

test("the ANALYSTS row surfaces real disagreement and names the strongest counter-evidence explicitly", async () => {
  const originalAnalyzeSymbol = technicalIntelligenceService.analyzeSymbol;
  technicalIntelligenceService.analyzeSymbol = async () => ({ enoughDataStatus: "INSUFFICIENT", signals: {} });

  try {
    const matrix = await evidenceMatrixService.buildEvidenceMatrix("AAPL");
    const analystsRow = matrix.categories.find((row) => row.category === "ANALYSTS");
    assert.equal(analystsRow.stance, "CONTRADICTORY");
    assert.ok(analystsRow.strongestCounterEvidence);
    assert.equal(analystsRow.isFixture, true);
  } finally {
    technicalIntelligenceService.analyzeSymbol = originalAnalyzeSymbol;
  }
});

test("a category with no real integration yet is honestly UNAVAILABLE, never a fabricated row", async () => {
  const originalAnalyzeSymbol = technicalIntelligenceService.analyzeSymbol;
  technicalIntelligenceService.analyzeSymbol = async () => ({ enoughDataStatus: "INSUFFICIENT", signals: {} });

  try {
    const matrix = await evidenceMatrixService.buildEvidenceMatrix("NVDA");
    const cotRow = matrix.categories.find((row) => row.category === "COT");
    assert.equal(cotRow.stance, "UNAVAILABLE");
    assert.ok(cotRow.reason);
  } finally {
    technicalIntelligenceService.analyzeSymbol = originalAnalyzeSymbol;
  }
});

test("the RESEARCH row is honestly UNAVAILABLE when the registry is empty", async () => {
  const originalAnalyzeSymbol = technicalIntelligenceService.analyzeSymbol;
  technicalIntelligenceService.analyzeSymbol = async () => ({ enoughDataStatus: "INSUFFICIENT", signals: {} });

  try {
    const matrix = await evidenceMatrixService.buildEvidenceMatrix("NVDA");
    const researchRow = matrix.categories.find((row) => row.category === "RESEARCH");
    assert.equal(researchRow.stance, "UNAVAILABLE");
    assert.ok(researchRow.reason);
  } finally {
    technicalIntelligenceService.analyzeSymbol = originalAnalyzeSymbol;
  }
});

test("the RESEARCH row reflects real registered principles, never a directional stance from research alone", async () => {
  const originalAnalyzeSymbol = technicalIntelligenceService.analyzeSymbol;
  technicalIntelligenceService.analyzeSymbol = async () => ({ enoughDataStatus: "INSUFFICIENT", signals: {} });

  try {
    await researchAgentService.registerPrinciple({
      name: "Mean reversion after extreme RSI",
      summary: "Prices tend to revert after extreme short-term RSI readings in range-bound regimes.",
      attributedSource: "Wilder, J.W. — New Concepts in Technical Trading Systems (1978), paraphrased",
      regimeRequirements: { regime: "RANGE_BOUND" },
      entryConditions: "RSI < 30 or RSI > 70 in a confirmed range",
      invalidationConditions: "Breakout of the range with volume",
      riskRules: "Stop beyond range boundary",
      knownFailureModes: "Fails in trending regimes",
    });

    const matrix = await evidenceMatrixService.buildEvidenceMatrix("NVDA");
    const researchRow = matrix.categories.find((row) => row.category === "RESEARCH");
    assert.equal(researchRow.stance, "NEUTRAL");
    assert.equal(researchRow.sourceCount, 1);
    assert.equal("isRecommendation" in researchRow, false);
  } finally {
    technicalIntelligenceService.analyzeSymbol = originalAnalyzeSymbol;
  }
});
