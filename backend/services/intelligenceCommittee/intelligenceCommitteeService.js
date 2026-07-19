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

async function convene(symbol) {
  const evidenceMatrix = await evidenceMatrixService.buildEvidenceMatrix(symbol);
  const memberOutputs = COMMITTEE_MEMBERS.map((member) => member.evaluate(evidenceMatrix));
  const committeeSummary = summarizeCommittee(memberOutputs);
  const cioSummary = summarizeForCio(committeeSummary);

  return {
    symbol,
    generatedAt: new Date().toISOString(),
    evidenceMatrixGeneratedAt: evidenceMatrix.generatedAt,
    committee: committeeSummary,
    cio: cioSummary,
    isVerdict: false, // the canonical recommendation engine remains the only verdict source
  };
}

module.exports = { convene };
