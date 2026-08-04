// Sprint 38 — Social Intelligence Specialist committee member.
//
// Consumes ONLY the SOCIAL row (X, political sources, executives, the
// influence model — folded into that row upstream by socialInfluenceService).
// Mission requires distinguishing fact, opinion, rumor, and market
// reaction. The SOCIAL row itself never carries a directional stance from
// posts alone (see evidenceMatrixService.buildSocialRow) — this member
// preserves that: it never upgrades social chatter into a directional
// signal, only reports what kind of claim it is.
const { findCategory, isRowAvailable } = require("../evidenceMatrixLookup");
const { buildMemberOutput } = require("../standardMemberOutput");

function evaluate(evidenceMatrix) {
  const social = findCategory(evidenceMatrix, "SOCIAL");

  if (!isRowAvailable(social)) {
    return buildMemberOutput({
      memberId: "socialIntelligenceSpecialist",
      memberName: "Social Intelligence Specialist",
      headline: "No watchlisted social activity is currently available.",
      reasoning: social.reason,
      confidence: 0,
      uncertainty: 100,
      freshness: "UNKNOWN",
      missingEvidence: [`SOCIAL: ${social.reason}`],
    });
  }

  return buildMemberOutput({
    memberId: "socialIntelligenceSpecialist",
    memberName: "Social Intelligence Specialist",
    headline: `${social.sourceCount} watchlisted post(s) reviewed — social evidence is never read as a directional signal on its own (fact/opinion/rumor/market-reaction must be distinguished at the source).`,
    reasoning: "Read from the SOCIAL row of the evidence matrix, which itself never assigns a directional stance from posts alone — only market-impact-tagged claims are surfaced.",
    supportingEvidence: [],
    counterEvidence: social.strongestCounterEvidence ? [{ category: "SOCIAL", reason: social.strongestCounterEvidence }] : [],
    confidence: social.confidence,
    uncertainty: social.uncertainty,
    freshness: social.isFixture ? "FIXTURE" : social.newestSource || "UNKNOWN",
    missingEvidence: social.isFixture ? ["SOCIAL: this reflects fixture data, not a live feed"] : [],
  });
}

module.exports = { evaluate };
