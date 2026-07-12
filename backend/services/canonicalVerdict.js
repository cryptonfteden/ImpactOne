// Sprint 18A — Canonical Decision Architecture.
//
// The canonical verdict contract named in INTELLIGENCE_PLATFORM_REVIEW.md
// §10 item 1: "the single canonical 'verdict' contract... every sprint the
// two coexist independently deepens the 'two engines disagree' trust
// problem." This module is the one place the Committee's 6-way vote scale
// is reconciled against the Recommendation Engine's persisted BUY/REDUCE/
// EXIT action, and the one function (buildCanonicalVerdictView) that
// assembles what the API/frontend actually render — guaranteeing exactly
// one action field ever reaches a response.
//
// normalizeCommitteeVoteToAction is exposed for internal reconciliation and
// testing only. It is deliberately never wired into a published API field —
// doing so would recreate the exact "committee publishes its own verdict"
// problem this module exists to prevent. The committee's allowed published
// fields (Sprint 18A requirement #2) are: supportingArguments,
// opposingArguments, expertVotes, disagreementLevel, consensusLevel,
// specialistObservations — never an action/decision/verdict field.
const CANONICAL_ACTIONS = ["BUY", "REDUCE", "EXIT", "HOLD"];

const COMMITTEE_VOTE_TO_ACTION = {
  "Strong Buy": "BUY",
  Buy: "BUY",
  Hold: "HOLD",
  Reduce: "REDUCE",
  Sell: "EXIT",
  "Strong Sell": "EXIT",
};

// A structural, defensive guard against the two-verdict problem —
// independent of whatever investmentCommitteeService.js happens to
// produce. If any of these keys ever appear on a committeeDebate object,
// this module strips them before the debate reaches an API response.
const FORBIDDEN_COMMITTEE_KEYS = ["action", "decision", "verdict", "finalDecision", "recommendation"];

function normalizeCommitteeVoteToAction(vote) {
  return COMMITTEE_VOTE_TO_ACTION[vote] || "HOLD";
}

function sanitizeCommitteeDebate(committeeDebate) {
  if (!committeeDebate || typeof committeeDebate !== "object") {
    return committeeDebate || null;
  }
  const sanitized = { ...committeeDebate };
  for (const key of FORBIDDEN_COMMITTEE_KEYS) {
    delete sanitized[key];
  }
  return sanitized;
}

/**
 * The one function that assembles what the API/frontend render for a
 * symbol's decision — exactly one action field (from the persisted
 * Recommendation, when one exists), with the committee's debate present
 * only as sanitized explanatory context, never a second verdict.
 */
function buildCanonicalVerdictView({ recommendation = null, committeeDebate = null } = {}) {
  const cleanDebate = sanitizeCommitteeDebate(committeeDebate);

  if (!recommendation) {
    return {
      hasCanonicalRecommendation: false,
      action: null,
      confidenceScore: null,
      qualityScore: null,
      riskLabel: null,
      committeeDebate: cleanDebate,
    };
  }

  return {
    hasCanonicalRecommendation: true,
    action: recommendation.action,
    confidenceScore: Number.isFinite(Number(recommendation.confidenceScore)) ? Number(recommendation.confidenceScore) : null,
    qualityScore: Number.isFinite(Number(recommendation.qualityScore)) ? Number(recommendation.qualityScore) : null,
    riskLabel: recommendation.riskLabel || null,
    committeeDebate: cleanDebate,
  };
}

module.exports = {
  CANONICAL_ACTIONS,
  COMMITTEE_VOTE_TO_ACTION,
  FORBIDDEN_COMMITTEE_KEYS,
  normalizeCommitteeVoteToAction,
  sanitizeCommitteeDebate,
  buildCanonicalVerdictView,
};
