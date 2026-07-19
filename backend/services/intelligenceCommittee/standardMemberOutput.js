// Sprint 38 — shared output shape every committee member must return.
//
// SAFETY-CRITICAL: this is the only place the standard shape is defined,
// so every member is structurally forced to answer the same questions
// (headline, reasoning, evidence, confidence, uncertainty, freshness,
// missing evidence) rather than inventing its own ad-hoc format. Never
// includes a verdict/action field — isRecommendation is always false,
// and the committee/CIO layers built on top of this must never average
// these confidence numbers into one score.
function buildMemberOutput({
  memberId,
  memberName,
  headline,
  reasoning,
  supportingEvidence = [],
  counterEvidence = [],
  confidence,
  uncertainty,
  freshness,
  missingEvidence = [],
}) {
  if (!memberId || !memberName) throw new Error("memberId and memberName are required");
  if (!headline || !reasoning) throw new Error("headline and reasoning are required");
  if (!Number.isFinite(confidence) || !Number.isFinite(uncertainty)) {
    throw new Error("confidence and uncertainty must be real numbers, never invented placeholders");
  }

  return {
    memberId,
    memberName,
    headline,
    reasoning,
    supportingEvidence,
    counterEvidence,
    confidence,
    uncertainty,
    freshness: freshness || "UNKNOWN",
    missingEvidence,
    isRecommendation: false,
  };
}

module.exports = { buildMemberOutput };
