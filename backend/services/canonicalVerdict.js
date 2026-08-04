// Sprint 18A — Canonical Decision Architecture.
//
// The canonical verdict contract named in INTELLIGENCE_PLATFORM_REVIEW.md
// §10 item 1: "the single canonical 'verdict' contract... every sprint the
// two coexist independently deepens the 'two engines disagree' trust
// problem." This module is the one function (buildCanonicalVerdictView)
// that assembles what the API/frontend actually render — guaranteeing
// exactly one action field ever reaches a response, with the committee's
// debate present only as sanitized explanatory context.
//
// Sprint 41 — Committee Unification. Removed normalizeCommitteeVoteToAction
// and COMMITTEE_VOTE_TO_ACTION: they reconciled the legacy committee's
// 6-way vote scale ("Strong Buy".."Strong Sell") against the Recommendation
// Engine's action, but the one unified committee (intelligenceCommitteeService,
// evidence-matrix-driven) never publishes a vote-scale string at all — it
// publishes qualitative agreement/disagreement per-member evidence, never
// a Buy/Sell-style vote. Dead code with the legacy system it existed for.
const CANONICAL_VERDICT_CONTRACT_VERSION = "1.0.0";

const CANONICAL_ACTIONS = ["BUY", "REDUCE", "EXIT", "HOLD"];

// A structural, defensive guard against the two-verdict problem —
// independent of whatever the committee (the one unified
// intelligenceCommitteeService) happens to produce. If any of these keys
// ever appear on a committeeDebate object, this module strips them before
// the debate reaches an API response.
const FORBIDDEN_COMMITTEE_KEYS = ["action", "decision", "verdict", "finalDecision", "recommendation"];

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
  CANONICAL_VERDICT_CONTRACT_VERSION,
  CANONICAL_ACTIONS,
  FORBIDDEN_COMMITTEE_KEYS,
  sanitizeCommitteeDebate,
  buildCanonicalVerdictView,
};
