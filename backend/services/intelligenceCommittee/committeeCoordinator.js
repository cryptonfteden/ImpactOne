// Sprint 38 — Committee Coordinator.
//
// SAFETY-CRITICAL: collects each member's independent standard output and
// summarizes agreement/disagreement/missing/stale evidence. The committee
// NEVER votes and NEVER averages confidence scores into one blended
// number — that would be exactly the "the AI decided" outcome the mission
// exists to remove. This file never imports a provider, evidenceMatrixService,
// or any recommendation/canonicalVerdict/portfolio/order module.
function leanOf(memberOutput) {
  const hasSupport = memberOutput.supportingEvidence.length > 0;
  const hasCounter = memberOutput.counterEvidence.length > 0;
  if (hasSupport && !hasCounter) return "SUPPORTIVE";
  if (hasCounter && !hasSupport) return "CONTRARY";
  if (hasSupport && hasCounter) return "MIXED";
  return "NEUTRAL";
}

function summarizeCommittee(memberOutputs) {
  if (!Array.isArray(memberOutputs) || !memberOutputs.length) {
    throw new Error("summarizeCommittee requires at least one member output");
  }

  const leans = memberOutputs.map((output) => ({ memberId: output.memberId, memberName: output.memberName, lean: leanOf(output) }));
  const supportiveCount = leans.filter((entry) => entry.lean === "SUPPORTIVE").length;
  const contraryCount = leans.filter((entry) => entry.lean === "CONTRARY").length;

  const agreement = supportiveCount > 0 && contraryCount === 0
    ? { status: "AGREEMENT", direction: "SUPPORTIVE", members: leans.filter((entry) => entry.lean === "SUPPORTIVE").map((entry) => entry.memberId) }
    : contraryCount > 0 && supportiveCount === 0
      ? { status: "AGREEMENT", direction: "CONTRARY", members: leans.filter((entry) => entry.lean === "CONTRARY").map((entry) => entry.memberId) }
      : { status: "NO_CLEAR_AGREEMENT", direction: null, members: [] };

  const disagreement = supportiveCount > 0 && contraryCount > 0
    ? {
        status: "DISAGREEMENT",
        supportiveMembers: leans.filter((entry) => entry.lean === "SUPPORTIVE").map((entry) => entry.memberId),
        contraryMembers: leans.filter((entry) => entry.lean === "CONTRARY").map((entry) => entry.memberId),
      }
    : { status: "NO_DISAGREEMENT", supportiveMembers: [], contraryMembers: [] };

  const allSupporting = memberOutputs.flatMap((output) => output.supportingEvidence.map((item) => ({ memberId: output.memberId, ...item })));
  const allCountering = memberOutputs.flatMap((output) => output.counterEvidence.map((item) => ({ memberId: output.memberId, ...item })));

  // "Strongest" = the member reporting it holds the highest confidence for
  // that side — never a numeric blend across members, just a pointer to
  // whichever single member's own (unaveraged) confidence is highest.
  const strongestSupportingEvidence = allSupporting.length
    ? allSupporting.reduce((best, item) => {
        const memberConfidence = memberOutputs.find((output) => output.memberId === item.memberId).confidence;
        return !best || memberConfidence > best.memberConfidence ? { ...item, memberConfidence } : best;
      }, null)
    : null;
  const strongestContradictoryEvidence = allCountering.length
    ? allCountering.reduce((best, item) => {
        const memberConfidence = memberOutputs.find((output) => output.memberId === item.memberId).confidence;
        return !best || memberConfidence > best.memberConfidence ? { ...item, memberConfidence } : best;
      }, null)
    : null;

  const missingEvidence = memberOutputs.flatMap((output) => output.missingEvidence.map((item) => ({ memberId: output.memberId, item })));
  const staleEvidence = memberOutputs
    .filter((output) => output.freshness === "STALE")
    .map((output) => ({ memberId: output.memberId, memberName: output.memberName }));

  return {
    members: memberOutputs,
    agreement,
    disagreement,
    strongestSupportingEvidence,
    strongestContradictoryEvidence,
    missingEvidence,
    staleEvidence,
    isVerdict: false, // the committee debates; it never votes and never produces a verdict
  };
}

module.exports = { summarizeCommittee, leanOf };
