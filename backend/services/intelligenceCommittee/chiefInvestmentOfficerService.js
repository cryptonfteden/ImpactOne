// Sprint 38 — Chief Investment Officer (CIO) layer.
//
// SAFETY-CRITICAL: the CIO never invents evidence — every field below is
// derived only from the committee summary it's given (which itself only
// carries member outputs derived only from the evidence matrix). The CIO
// never produces a blended/averaged confidence number; "confidence" here
// is a qualitative read of how many members agree, not a computed score.
// This file never imports a provider, evidenceMatrixService, or any
// recommendation/canonicalVerdict/portfolio/order module.
function summarizeForCio(committeeSummary) {
  const { members, agreement, disagreement, strongestContradictoryEvidence, missingEvidence, staleEvidence } = committeeSummary;

  const overallThesis = agreement.status === "AGREEMENT"
    ? `${agreement.members.length} of ${members.length} committee members lean ${agreement.direction.toLowerCase()}, with no members reporting the opposite lean.`
    : disagreement.status === "DISAGREEMENT"
      ? `The committee is split: ${disagreement.supportiveMembers.length} member(s) lean supportive, ${disagreement.contraryMembers.length} lean contrary.`
      : "No clear directional lean emerged from the committee.";

  const confidence = agreement.status === "AGREEMENT" && agreement.members.length === members.length
    ? "HIGH_UNANIMOUS"
    : agreement.status === "AGREEMENT"
      ? "MODERATE_MAJORITY"
      : disagreement.status === "DISAGREEMENT"
        ? "LOW_SPLIT"
        : "LOW_NO_SIGNAL";

  const largestDisagreement = disagreement.status === "DISAGREEMENT"
    ? `${disagreement.supportiveMembers.join(", ")} vs. ${disagreement.contraryMembers.join(", ")}`
    : null;

  const highestRisk = strongestContradictoryEvidence
    ? `${strongestContradictoryEvidence.memberId}: ${strongestContradictoryEvidence.reason}`
    : "No single strongest counter-evidence was reported by any member.";

  const missingInformation = [...new Set(missingEvidence.map((entry) => entry.item))];

  const whyRecommendationExists = agreement.status === "AGREEMENT"
    ? `Independent members covering different evidence sources converged on the same lean (${agreement.direction.toLowerCase()}) without being shown each other's conclusions.`
    : "No strong convergence exists — any downstream recommendation should be read as low-confidence.";

  const whyRecommendationMayBeWrong = [
    ...(largestDisagreement ? [`Committee members disagree: ${largestDisagreement}.`] : []),
    ...(missingInformation.length ? [`Missing evidence: ${missingInformation.join("; ")}.`] : []),
    ...(staleEvidence.length ? [`Stale evidence from: ${staleEvidence.map((entry) => entry.memberName).join(", ")}.`] : []),
  ];

  return {
    overallThesis,
    confidence,
    largestDisagreement,
    highestRisk,
    missingInformation,
    whyRecommendationExists,
    whyRecommendationMayBeWrong,
    isVerdict: false, // the CIO summarizes the committee; the canonical recommendation engine remains the only verdict source
  };
}

module.exports = { summarizeForCio };
