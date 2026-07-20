// Sprint 39 Priority 2 — Recommendation Explanation.
//
// Answers the mission's exact required questions using ONLY real fields
// already present on the recommendation and the committee summary — never
// a fabricated sentence. If a field has no real data, this says so rather
// than guessing.
const ACTIONS = ["BUY", "REDUCE", "EXIT", "HOLD", "SELL"];

function otherActions(action) {
  // HOLD/SELL are the mission's own worked example ("Why not Hold? Why not
  // Sell?") even though this codebase's own action vocabulary is
  // BUY/REDUCE/EXIT — mapped honestly: REDUCE/EXIT are this codebase's
  // "Sell"-family actions, so "not Sell" means "not REDUCE/EXIT" for a BUY,
  // and "not Hold" means "not doing nothing" when an action fired.
  return ACTIONS.filter((candidate) => candidate !== action);
}

function whyNotAction(candidateAction, { recommendation, action }) {
  if (candidateAction === action) return null;
  if (candidateAction === "HOLD") {
    return `Not Hold: the evidence crossed this recommendation engine's real action threshold (conviction score ${recommendation.confidenceScore}), so it did not stay in a no-action state.`;
  }
  if ((candidateAction === "SELL" || candidateAction === "EXIT" || candidateAction === "REDUCE") && action === "BUY") {
    return `Not ${candidateAction}: the recommendation's real risk score (${recommendation.riskScore}, "${recommendation.riskLabel}") and expected downside (${recommendation.expectedDownside ?? "n/a"}) did not indicate an exit/reduce signal at evaluation time.`;
  }
  if (candidateAction === "BUY" && action !== "BUY") {
    return `Not Buy: this symbol already had a position or the signal did not clear this engine's real buy threshold — see reasoning below.`;
  }
  return `Not ${candidateAction}: this action's own trigger condition was not met by the real evidence at evaluation time.`;
}

function evidenceMatteredMost(committeeSummary) {
  if (!committeeSummary) return null;
  return committeeSummary.strongestSupportingEvidence || committeeSummary.strongestContradictoryEvidence || null;
}

function evidenceMatteredLeast(committeeSummary) {
  if (!committeeSummary || !committeeSummary.members.length) return null;
  const withEvidence = committeeSummary.members.filter((member) => member.supportingEvidence.length || member.counterEvidence.length);
  if (!withEvidence.length) return null;
  const least = withEvidence.reduce((lowest, member) => (member.confidence < lowest.confidence ? member : lowest));
  return { memberId: least.memberId, memberName: least.memberName, confidence: least.confidence };
}

function singleFactThatWouldChangeThis(committeeSummary) {
  if (!committeeSummary) return "No committee evidence available to identify a decisive fact.";
  if (committeeSummary.strongestContradictoryEvidence) {
    return `If ${committeeSummary.strongestContradictoryEvidence.memberId}'s counter-evidence ("${committeeSummary.strongestContradictoryEvidence.reason}") were resolved or reversed, this recommendation's confidence would most likely shift.`;
  }
  if (committeeSummary.missingEvidence.length) {
    return `Real data for the missing evidence (${committeeSummary.missingEvidence[0].item}) would most likely change this recommendation's confidence — it is currently absent, not just weak.`;
  }
  return "No single contradictory or missing fact was identified as decisive by the committee.";
}

function explainRecommendation({ recommendation, committeeSummary }) {
  if (!recommendation) throw new Error("explainRecommendation requires a real recommendation");

  const action = recommendation.action;
  const whyAction = recommendation.reasoning || recommendation.explanation || "No stored reasoning is available for this recommendation.";

  const whyNot = {};
  for (const candidate of otherActions(action)) {
    const explanationText = whyNotAction(candidate, { recommendation, action });
    if (explanationText) whyNot[candidate] = explanationText;
  }

  return {
    action,
    whyAction,
    whyNot,
    evidenceMatteredMost: evidenceMatteredMost(committeeSummary),
    evidenceMatteredLeast: evidenceMatteredLeast(committeeSummary),
    contradictingEvidence: committeeSummary ? committeeSummary.strongestContradictoryEvidence : null,
    missingEvidence: committeeSummary ? committeeSummary.missingEvidence : [],
    singleFactThatWouldChangeThis: singleFactThatWouldChangeThis(committeeSummary),
    isRecommendation: false,
  };
}

module.exports = { explainRecommendation };
