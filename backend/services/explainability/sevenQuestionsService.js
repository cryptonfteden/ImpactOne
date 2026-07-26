// Phase X7 — Part 2, Explainability Engine. This module invents nothing:
// it derives the mission's exact seven required questions from fields the
// Sprint 39 explainability bundle (decisionTraceExplainabilityService.js)
// already computes for real — recommendationExplanationService.js's
// whyAction/evidenceMatteredMost/missingEvidence/singleFactThatWouldChangeThis,
// the DecisionTrace's own rankingResult.symbolSource, and the live
// committee's confidence/missingEvidence. A pure mapping/relabeling layer,
// not a second explanation engine.
const SOURCE_LABEL = {
  portfolio: "You hold this position — it directly affects your real portfolio value.",
  watchlist: "This symbol is on your watchlist — it doesn't affect your portfolio yet, but you're tracking it.",
  "market-scan": "This came from a general market scan — you don't currently hold or track this symbol.",
};

// Answers the mission's seven required questions from an already-built
// explainability bundle (decisionTraceExplainabilityService.explainRecommendationById's
// return value). Every field below traces to a real value on that bundle
// — nothing computed fresh, nothing fabricated.
function buildSevenQuestions(bundle) {
  const { symbol, explanation, decisionTrace, liveCommittee, confidence, uncertainty, disagreement } = bundle;
  const symbolSource = decisionTrace?.rankingResult?.symbolSource || null;

  return {
    whatHappened: `${symbol} received a ${explanation.action} recommendation.`,
    whyItMatters: explanation.whyAction,
    whoIsAffected: SOURCE_LABEL[symbolSource] || "Relevance to your portfolio/watchlist could not be determined for this recommendation.",
    howConfident: {
      confidence,
      uncertainty,
      label: confidence >= 75 ? "High confidence" : confidence >= 50 ? "Moderate confidence" : "Low confidence",
    },
    whatEvidenceSupports: explanation.evidenceMatteredMost
      ? { memberId: explanation.evidenceMatteredMost.memberId, reason: explanation.evidenceMatteredMost.reason }
      : null,
    whatIsMissing: [
      ...(explanation.missingEvidence || []),
      ...((liveCommittee?.unavailableEvidence || []).map((entry) => ({ item: entry.category, reason: entry.reason }))),
    ],
    whatWouldInvalidate: explanation.singleFactThatWouldChangeThis,
    // Not one of the seven, but real and directly relevant context this
    // bundle already computed — included rather than discarded.
    disagreementLevel: disagreement?.level ?? null,
  };
}

module.exports = { buildSevenQuestions };
