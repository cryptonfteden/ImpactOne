// Sprint 38 — Investment Intelligence Committee orchestrator.
//
// This is the ONLY file in this subsystem allowed to call
// evidenceMatrixService.buildEvidenceMatrix — it builds the matrix once
// and hands the same object to every member, so no member ever fetches a
// provider or the matrix itself. Flow: Providers -> Evidence Matrix ->
// Committee -> (Recommendation Engine, unchanged, elsewhere).
const evidenceMatrixService = require("../intelligence/evidenceMatrixService");
const { summarizeCommittee } = require("./committeeCoordinator");
const { summarizeForCio } = require("./chiefInvestmentOfficerService");

const macroEconomistMember = require("./members/macroEconomistMember");
const technicalAnalystMember = require("./members/technicalAnalystMember");
const institutionalSpecialistMember = require("./members/institutionalSpecialistMember");
const derivativesSpecialistMember = require("./members/derivativesSpecialistMember");
const socialIntelligenceMember = require("./members/socialIntelligenceMember");
const equityResearchMember = require("./members/equityResearchMember");
const marketSentimentMember = require("./members/marketSentimentMember");
const researchSpecialistMember = require("./members/researchSpecialistMember");

const COMMITTEE_MEMBERS = [
  macroEconomistMember,
  technicalAnalystMember,
  institutionalSpecialistMember,
  derivativesSpecialistMember,
  socialIntelligenceMember,
  equityResearchMember,
  marketSentimentMember,
  researchSpecialistMember,
];

// Sprint 39 Priority 7 — What-If Engine support. excludeCategory, when
// given, replaces that single category's row with an honest UNAVAILABLE
// row before any member sees the matrix — this REMOVES real evidence, it
// never adjusts a weight or invents a substitute row. Every other
// category's row is passed through completely unchanged.
function applyExclusion(evidenceMatrix, excludeCategory) {
  if (!excludeCategory) return evidenceMatrix;
  return {
    ...evidenceMatrix,
    categories: evidenceMatrix.categories.map((row) =>
      row.category === excludeCategory
        ? { category: row.category, stance: "UNAVAILABLE", confidence: 0, uncertainty: 100, sourceCount: 0, newestSource: null, strongestCounterEvidence: null, reason: "Excluded for what-if analysis." }
        : row
    ),
  };
}

async function convene(symbol, { excludeCategory } = {}) {
  const rawEvidenceMatrix = await evidenceMatrixService.buildEvidenceMatrix(symbol);
  const evidenceMatrix = applyExclusion(rawEvidenceMatrix, excludeCategory);
  const memberOutputs = COMMITTEE_MEMBERS.map((member) => member.evaluate(evidenceMatrix));
  const committeeSummary = summarizeCommittee(memberOutputs);
  const cioSummary = summarizeForCio(committeeSummary);

  return {
    symbol,
    generatedAt: new Date().toISOString(),
    evidenceMatrixGeneratedAt: rawEvidenceMatrix.generatedAt,
    evidenceMatrix, // Sprint 39 — exposed for explainability/provenance callers; still the exact same never-a-verdict object.
    excludedCategory: excludeCategory || null,
    committee: committeeSummary,
    cio: cioSummary,
    isVerdict: false, // the canonical recommendation engine remains the only verdict source
  };
}

module.exports = { convene };
