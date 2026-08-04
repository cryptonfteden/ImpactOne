// Sprint 38 — Research Specialist committee member.
//
// Consumes ONLY the RESEARCH row of the evidence matrix (the research
// registry via researchAgentService, wired in this sprint). Mission is
// explicit: must never claim "this strategy works" — only ever reports
// applicable regime, supporting/conflicting research, and real testing
// status. Never fetches researchAgentService directly; only reads the
// row it's given.
const { findCategory, isRowAvailable } = require("../evidenceMatrixLookup");
const { buildMemberOutput } = require("../standardMemberOutput");

function evaluate(evidenceMatrix) {
  const research = findCategory(evidenceMatrix, "RESEARCH");

  if (!isRowAvailable(research)) {
    return buildMemberOutput({
      memberId: "researchSpecialist",
      memberName: "Research Specialist",
      headline: "No registered research principle references this symbol.",
      reasoning: research.reason,
      confidence: 0,
      uncertainty: 100,
      freshness: "UNKNOWN",
      missingEvidence: [`RESEARCH: ${research.reason}`],
    });
  }

  return buildMemberOutput({
    memberId: "researchSpecialist",
    memberName: "Research Specialist",
    headline: `${research.sourceCount} registry principle(s) apply — reported by regime and test status, never claimed as "proven."`,
    reasoning: research.reason,
    supportingEvidence: [{ category: "RESEARCH", reason: research.reason }],
    counterEvidence: [],
    confidence: research.confidence,
    uncertainty: research.uncertainty,
    freshness: research.newestSource || "UNKNOWN",
    missingEvidence: [],
  });
}

module.exports = { evaluate };
