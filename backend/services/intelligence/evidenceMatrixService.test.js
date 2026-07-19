const test = require("node:test");
const assert = require("node:assert/strict");

const evidenceMatrixService = require("./evidenceMatrixService");
const technicalIntelligenceService = require("./technicalIntelligenceService");

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
