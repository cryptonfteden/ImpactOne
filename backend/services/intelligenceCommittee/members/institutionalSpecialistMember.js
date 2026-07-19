// Sprint 38 — Institutional Specialist committee member.
//
// Consumes ONLY the INSTITUTIONS row (ETF, SPDR, insider, congress,
// institutional activity — folded into that row upstream). When the
// underlying adapters are UNCONFIGURED, this member reports UNAVAILABLE
// honestly rather than fabricating institutional-flow commentary.
const { findCategory, isRowAvailable } = require("../evidenceMatrixLookup");
const { buildMemberOutput } = require("../standardMemberOutput");

function evaluate(evidenceMatrix) {
  const institutions = findCategory(evidenceMatrix, "INSTITUTIONS");

  if (!isRowAvailable(institutions)) {
    return buildMemberOutput({
      memberId: "institutionalSpecialist",
      memberName: "Institutional Specialist",
      headline: "No institutional-activity evidence is currently available.",
      reasoning: institutions.reason,
      confidence: 0,
      uncertainty: 100,
      freshness: "UNKNOWN",
      missingEvidence: [`INSTITUTIONS: ${institutions.reason}`],
    });
  }

  return buildMemberOutput({
    memberId: "institutionalSpecialist",
    memberName: "Institutional Specialist",
    headline: institutions.stance === "SUPPORTIVE"
      ? "Institutional activity is supportive."
      : institutions.stance === "CONTRADICTORY"
        ? "Institutional activity is contradictory to the prevailing narrative."
        : "Institutional activity is neutral.",
    reasoning: institutions.reason || "Read from the INSTITUTIONS row of the evidence matrix.",
    supportingEvidence: institutions.stance === "SUPPORTIVE" ? [{ category: "INSTITUTIONS", reason: institutions.reason }] : [],
    counterEvidence: institutions.strongestCounterEvidence ? [{ category: "INSTITUTIONS", reason: institutions.strongestCounterEvidence }] : [],
    confidence: institutions.confidence,
    uncertainty: institutions.uncertainty,
    freshness: institutions.newestSource || "UNKNOWN",
    missingEvidence: [],
  });
}

module.exports = { evaluate };
