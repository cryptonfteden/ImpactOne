// Phase PLATFORM-INTELLIGENCE-001 — the shared Intelligence Engine every
// Workspace (Mission Control, Portfolio Workspace, News Intelligence,
// Watchlist Workspace, AI Analysis Workspace) consumes instead of each
// screen independently reimplementing its own version of the same
// reasoning primitive. Every function here is presentation-only logic
// over data the platform's real backend services already computed
// (Attention Engine scores, Claim confidence/evidence, Autonomous Market
// opportunity/risk scores) — nothing here invents a new score or
// fabricates intelligence; it only ranks, selects, and narrates what
// already exists, consistently, in exactly one place.

// ---------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------

// The one generic "sort by a numeric score, descending, honestly
// treating a missing score as lowest" primitive — previously
// reimplemented inline by News Intelligence's feed ranking and Watchlist
// Workspace's symbol-priority ranking.
export function rankByScore(items, scoreKey) {
  return [...(items || [])].sort((a, b) => (b?.[scoreKey] ?? -1) - (a?.[scoreKey] ?? -1));
}

// Ranks entities (portfolio positions, watchlist symbols, etc.) by the
// highest real Attention Score among the Claims that actually name that
// entity's symbol — never a new score, a presentation-only max() over
// already-scored Claims. Previously reimplemented by Portfolio
// Workspace's `positionAttention`.
export function rankBySymbolAttention(entities, claims, getSymbol) {
  const claimList = claims || [];
  return entities
    .map((entity) => {
      const symbol = getSymbol(entity);
      const claimsForSymbol = claimList.filter((claim) => claim.symbols?.includes(symbol));
      const attentionScore = claimsForSymbol.length ? claimsForSymbol.reduce((max, claim) => Math.max(max, claim.attentionScore ?? 0), 0) : null;
      return { ...entity, attentionScore };
    })
    .sort((a, b) => (b.attentionScore ?? -1) - (a.attentionScore ?? -1));
}

// ---------------------------------------------------------------------
// Claim prioritization
// ---------------------------------------------------------------------

// The one shared "which Claim matters most" ordering: highest real
// Confidence first, honestly treating a missing confidence as lowest.
// Previously reimplemented by Mission Control's `byConfidenceDesc` and
// AI Analysis Workspace's subject-claim selection.
export function prioritizeClaims(claims) {
  return rankByScore(claims, "confidence");
}

// Recommendation generation — the highest-confidence real Claim in a
// given expected direction (e.g. the platform's single biggest real risk
// or best real opportunity). Previously reimplemented by Mission
// Control's Biggest Risk/Best Opportunity selection.
export function selectTopClaimByDirection(claims, direction) {
  return prioritizeClaims((claims || []).filter((claim) => claim.expectedDirection === direction))[0] || null;
}

// Recommendation generation — the single Claim a Workspace should treat
// as "the" subject when nothing more specific has been selected: the
// highest-confidence real Claim available. Previously reimplemented by
// AI Analysis Workspace's subject-selection step.
export function selectTopClaim(claims) {
  return prioritizeClaims(claims)[0] || null;
}

// Portfolio-impact-first, confidence-second, urgency-third ordering —
// the real sort order Portfolio Workspace's "Why This Affects You"
// section already required (UI-INTEGRATION-001's mission), extracted
// here as the one shared implementation rather than left inline.
export function prioritizeClaimsByPortfolioImpact(claims) {
  const daysUntilExpiry = (claim) => (claim.expiresAt ? (new Date(claim.expiresAt).getTime() - Date.now()) / 86400000 : Infinity);
  return [...(claims || [])].sort((claimA, claimB) => {
    const impactA = claimA.portfolioImpact?.magnitude ?? 0;
    const impactB = claimB.portfolioImpact?.magnitude ?? 0;
    if (impactB !== impactA) return impactB - impactA;
    const confidenceA = claimA.confidence ?? -1;
    const confidenceB = claimB.confidence ?? -1;
    if (confidenceB !== confidenceA) return confidenceB - confidenceA;
    return daysUntilExpiry(claimA) - daysUntilExpiry(claimB);
  });
}

// ---------------------------------------------------------------------
// Contradiction detection
// ---------------------------------------------------------------------

// A real Claim is "contested" for presentation purposes exactly when it
// carries at least one real piece of counter-evidence — never inferred
// from anything else. One shared definition instead of each screen
// independently checking `claim.counterEvidence?.length`.
export function detectContradiction(claim) {
  const supportingCount = claim?.evidence?.length || 0;
  const contradictingCount = claim?.counterEvidence?.length || 0;
  return {
    hasContradiction: contradictingCount > 0,
    supportingCount,
    contradictingCount,
  };
}

// ---------------------------------------------------------------------
// Evidence weighting
// ---------------------------------------------------------------------

// Client-side evidence weighting for an already-fetched evidence list:
// ranks by each entry's real, already-computed `contributionToClaim`
// (falling back to raw confidence when contribution hasn't been
// computed) — the same ranking rule claimConsumerService.js's
// `getStrongestEvidence` already applies server-side, made available
// here for any Workspace holding a local evidence array rather than
// re-deriving its own rule.
export function rankEvidenceByContribution(evidenceRows, { limit } = {}) {
  const rank = (row) => (Number.isFinite(row?.contributionToClaim) ? row.contributionToClaim : row?.confidence ?? -1);
  const ranked = [...(evidenceRows || [])].sort((a, b) => rank(b) - rank(a));
  return limit ? ranked.slice(0, limit) : ranked;
}

// Turns a (optionally weighted) evidence list into one honest summary
// sentence — the same "take the top N, join their observed facts, or
// say honestly there's nothing" pattern previously duplicated across
// Portfolio Workspace's and AI Analysis Workspace's own section builders.
export function summarizeEvidence(evidenceRows, fallbackText, { limit = 2 } = {}) {
  if (!evidenceRows?.length) return fallbackText;
  return rankEvidenceByContribution(evidenceRows, { limit })
    .map((entry) => entry.observedFact)
    .filter(Boolean)
    .join(" ") || fallbackText;
}

// ---------------------------------------------------------------------
// Next-action generation
// ---------------------------------------------------------------------

const NEXT_ACTION_SCORE_THRESHOLD = 70;

// One shared next-action rule, usable both by real Autonomous Market
// rankings (which already carry their own opportunityScore/riskScore)
// and by real Claims (whose confidence + expectedDirection are mapped
// onto the same opportunity/risk framing so both subjects share one
// rule and one set of thresholds) — previously reimplemented locally as
// Watchlist Workspace's `nextActionFor`.
export function recommendNextAction(subject) {
  const opportunityScore = Number.isFinite(subject?.opportunityScore)
    ? subject.opportunityScore
    : subject?.expectedDirection === "BULLISH"
      ? subject?.confidence ?? 0
      : 0;
  const riskScore = Number.isFinite(subject?.riskScore)
    ? subject.riskScore
    : subject?.expectedDirection === "BEARISH"
      ? subject?.confidence ?? 0
      : 0;

  if (riskScore >= NEXT_ACTION_SCORE_THRESHOLD) return "Review risk exposure — this symbol's risk score is elevated.";
  if (opportunityScore >= NEXT_ACTION_SCORE_THRESHOLD) return "Consider building or adding to this position.";
  return "No action needed — keep monitoring.";
}

// ---------------------------------------------------------------------
// Reasoning pipeline
// ---------------------------------------------------------------------

// The one canonical reasoning breakdown — every Workspace that explains
// "what does the platform believe and why" renders these same six
// questions, in this order, over the same real Claim fields. Labels are
// overridable (Portfolio Workspace keeps its own i18n-translated labels)
// but the underlying content-generation logic — what text goes in each
// section — is computed here exactly once.
const DEFAULT_REASONING_LABELS = {
  whatIsHappening: "What is happening",
  whyBelieved: "Why the platform believes it",
  supportingEvidence: "Evidence that supports it",
  contradictingEvidence: "Evidence that contradicts it",
  invalidation: "What could invalidate this thesis",
  monitorNext: "What to monitor next",
};

export function buildClaimReasoningSections(claim, { labels = {}, evidenceLimit = 2 } = {}) {
  const L = { ...DEFAULT_REASONING_LABELS, ...labels };
  const observed = claim?.reasoning?.observed || [];
  const inferred = claim?.reasoning?.inferred || [];

  const whyBelievedContent =
    observed.length || inferred.length
      ? `${observed.join(" ")} ${inferred.length ? `Inferred: ${inferred.join(" ")}` : ""}`.trim()
      : "No detailed reasoning trace recorded for this Claim yet.";

  return [
    { label: L.whatIsHappening, content: claim?.plainLanguageStatement || claim?.statement },
    { label: L.whyBelieved, content: whyBelievedContent },
    { label: L.supportingEvidence, content: summarizeEvidence(claim?.evidence, "No supporting evidence recorded yet.", { limit: evidenceLimit }) },
    {
      label: L.contradictingEvidence,
      content: summarizeEvidence(claim?.counterEvidence, "No contradicting evidence recorded — this thesis is currently uncontested.", { limit: evidenceLimit }),
    },
    { label: L.invalidation, content: claim?.invalidationConditions?.length ? claim.invalidationConditions.join(" ") : "No invalidation conditions recorded for this Claim yet." },
    { label: L.monitorNext, content: claim?.confirmationConditions?.length ? claim.confirmationConditions.join(" ") : "No specific confirmation conditions recorded for this Claim yet." },
  ];
}
