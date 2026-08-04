// Sprint 38 — Equity Research Specialist committee member.
//
// Consumes ONLY the ANALYSTS and FUNDAMENTALS rows (analyst ratings,
// earnings, revisions, valuation). Mission requires detecting analyst
// disagreement explicitly — the ANALYSTS row upstream already computes
// this (analystConsensusService), and this member surfaces it rather than
// smoothing it into one number.
const { findCategory, isRowAvailable } = require("../evidenceMatrixLookup");
const { buildMemberOutput } = require("../standardMemberOutput");

function evaluate(evidenceMatrix) {
  const analysts = findCategory(evidenceMatrix, "ANALYSTS");
  const fundamentals = findCategory(evidenceMatrix, "FUNDAMENTALS");

  const missingEvidence = [];
  if (!isRowAvailable(analysts)) missingEvidence.push(`ANALYSTS: ${analysts.reason}`);
  if (!isRowAvailable(fundamentals)) missingEvidence.push(`FUNDAMENTALS: ${fundamentals.reason}`);

  if (!isRowAvailable(analysts) && !isRowAvailable(fundamentals)) {
    return buildMemberOutput({
      memberId: "equityResearchSpecialist",
      memberName: "Equity Research Specialist",
      headline: "No analyst or fundamentals evidence is currently available.",
      reasoning: "Neither ANALYSTS nor FUNDAMENTALS rows have real data for this symbol.",
      confidence: 0,
      uncertainty: 100,
      freshness: "UNKNOWN",
      missingEvidence,
    });
  }

  const headline = isRowAvailable(analysts) && analysts.disagreement
    ? "Analysts disagree — this is not a consensus view."
    : isRowAvailable(analysts)
      ? `Analyst stance: ${analysts.stance}.`
      : "Analyst ratings are unavailable; relying on fundamentals only.";

  return buildMemberOutput({
    memberId: "equityResearchSpecialist",
    memberName: "Equity Research Specialist",
    headline,
    reasoning: isRowAvailable(analysts)
      ? `${analysts.sourceCount} rating(s) reviewed; disagreement=${analysts.disagreement}.`
      : fundamentals.reason,
    supportingEvidence: isRowAvailable(analysts) && analysts.stance === "SUPPORTIVE" ? [{ category: "ANALYSTS", reason: "Ratings skew positive" }] : [],
    counterEvidence: analysts.strongestCounterEvidence ? [{ category: "ANALYSTS", reason: analysts.strongestCounterEvidence }] : [],
    confidence: isRowAvailable(analysts) ? analysts.confidence : 0,
    uncertainty: isRowAvailable(analysts) ? analysts.uncertainty : 100,
    freshness: isRowAvailable(analysts) ? (analysts.newestSource || "UNKNOWN") : "UNKNOWN",
    missingEvidence,
  });
}

module.exports = { evaluate };
