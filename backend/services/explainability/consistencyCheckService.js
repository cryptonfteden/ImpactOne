// Sprint 39 Priority 6 — Recommendation Consistency.
//
// Prevents a silent mismatch between the live Recommendation Engine's
// action and the Sprint 38 evidence-matrix committee's lean. Never hides
// a mismatch — if one exists, this returns an explicit explanation
// referencing the real committee data, never a fabricated reconciliation.
const BUY_LIKE = ["BUY"];
const SELL_LIKE = ["REDUCE", "EXIT"];

function expectedLeanForAction(action) {
  if (BUY_LIKE.includes(action)) return "SUPPORTIVE";
  if (SELL_LIKE.includes(action)) return "CONTRARY";
  return null;
}

function checkConsistency({ recommendationAction, committeeSummary }) {
  if (!committeeSummary) {
    return { consistent: null, mismatchExplanation: "No committee snapshot is available to check consistency against.", checkedAt: new Date().toISOString() };
  }

  const expectedLean = expectedLeanForAction(recommendationAction);
  if (!expectedLean) {
    return { consistent: null, mismatchExplanation: `No known consistency rule for action "${recommendationAction}".`, checkedAt: new Date().toISOString() };
  }

  const { agreement, disagreement } = committeeSummary;
  const actualLean = agreement.status === "AGREEMENT" ? agreement.direction : disagreement.status === "DISAGREEMENT" ? "SPLIT" : "NO_CLEAR_LEAN";

  if (actualLean === expectedLean) {
    return { consistent: true, mismatchExplanation: null, checkedAt: new Date().toISOString() };
  }

  let mismatchExplanation;
  if (actualLean === "SPLIT") {
    mismatchExplanation = `Recommendation is ${recommendationAction} (expects a ${expectedLean.toLowerCase()} committee lean), but the committee is currently split: ${disagreement.supportiveMembers.join(", ") || "none"} lean supportive vs. ${disagreement.contraryMembers.join(", ") || "none"} lean contrary. This is a live re-evaluation and may reflect evidence that has changed since the recommendation was made.`;
  } else if (actualLean === "NO_CLEAR_LEAN") {
    mismatchExplanation = `Recommendation is ${recommendationAction}, but the committee currently has no clear directional lean (insufficient available evidence). This is a live re-evaluation and may reflect evidence that has changed since the recommendation was made.`;
  } else {
    mismatchExplanation = `Recommendation is ${recommendationAction} (expects a ${expectedLean.toLowerCase()} committee lean), but the committee currently leans ${actualLean.toLowerCase()}. This is a live re-evaluation and may reflect evidence that has changed since the recommendation was made.`;
  }

  return { consistent: false, mismatchExplanation, checkedAt: new Date().toISOString() };
}

module.exports = { checkConsistency };
