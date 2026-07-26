// Phase PRODUCT-001 — the ONE canonical prioritization service. Every
// screen that needs to answer "what should I look at first?" reads an
// Attention Score from here — never a second, screen-local ranking
// formula. See ATTENTION_ENGINE_SPEC.md for the full rationale.
//
// Deterministic by construction: computeAttentionScore is a pure function
// of its inputs (no randomness, no wall-clock reads inside it — freshness
// callers must pass `now` explicitly), so the same claim/item/context
// always produces the same score and the same explanation.

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Fixed weights, sum to 1.00. Order here is also the tie-break order used
// when building the explanation (highest-weighted factor named first).
const FACTOR_WEIGHTS = {
  portfolioRelevance: { weight: 0.22, label: "portfolio relevance" },
  confidence: { weight: 0.16, label: "confidence" },
  urgency: { weight: 0.14, label: "urgency" },
  marketImpact: { weight: 0.14, label: "market impact" },
  freshness: { weight: 0.12, label: "freshness" },
  probability: { weight: 0.1, label: "probability" },
  supportingEngines: { weight: 0.07, label: "number of supporting engines" },
  riskLevel: { weight: 0.05, label: "risk level" },
};

/**
 * Core scorer. `factors` may supply any subset of the keys in
 * FACTOR_WEIGHTS, each a 0-100 number. Missing/non-finite factors are
 * excluded (never fabricated as 0) and the remaining weights are
 * renormalized to sum to 1 — an item that's genuinely missing some inputs
 * is judged only on the real inputs it has, never penalized for an
 * absence disguised as a low score.
 */
function computeAttentionScore(factors = {}) {
  const present = Object.keys(FACTOR_WEIGHTS).filter((key) => Number.isFinite(factors[key]));

  if (!present.length) {
    return {
      score: 0,
      explanation: "No attention inputs available yet.",
      factors: [],
      missingFactors: Object.keys(FACTOR_WEIGHTS),
    };
  }

  const totalWeight = present.reduce((sum, key) => sum + FACTOR_WEIGHTS[key].weight, 0);

  const contributions = present.map((key) => {
    const normalizedWeight = FACTOR_WEIGHTS[key].weight / totalWeight;
    const value = clamp(Number(factors[key]), 0, 100);
    return {
      key,
      label: FACTOR_WEIGHTS[key].label,
      value,
      weight: Number(normalizedWeight.toFixed(4)),
      contribution: value * normalizedWeight,
    };
  });

  const score = Math.round(clamp(contributions.reduce((sum, entry) => sum + entry.contribution, 0), 0, 100));

  const topFactors = [...contributions].sort((a, b) => b.contribution - a.contribution).slice(0, 3);
  const explanation = topFactors.length
    ? `Ranked ${score}/100, driven mainly by ${topFactors.map((entry) => `${entry.label} (${Math.round(entry.value)})`).join(", ")}.`
    : "No attention inputs available yet.";

  return {
    score,
    explanation,
    factors: contributions,
    missingFactors: Object.keys(FACTOR_WEIGHTS).filter((key) => !present.includes(key)),
  };
}

/**
 * Linear 7-day decay: a claim/item updated right now scores 100, one
 * updated 7+ days ago scores 0. `now` must be passed explicitly by the
 * caller so this stays a pure, deterministic function — never reads the
 * wall clock itself.
 */
const FRESHNESS_HALF_LIFE_HOURS = 168; // 7 days

function computeFreshnessScore(timestamp, { now } = {}) {
  if (!timestamp || !now) return null;
  const updatedAt = new Date(timestamp).getTime();
  const reference = new Date(now).getTime();
  if (!Number.isFinite(updatedAt) || !Number.isFinite(reference)) return null;

  const ageHours = (reference - updatedAt) / (60 * 60 * 1000);
  if (ageHours < 0) return 100;
  return Math.round(clamp(100 * (1 - ageHours / FRESHNESS_HALF_LIFE_HOURS), 0, 100));
}

// A claim's real lifecycle status is itself a signal of how urgently it
// deserves attention — a claim actively transitioning (strengthening,
// weakening, contested) needs a decision now; a stable ACTIVE claim or a
// brand-new DRAFT less so; a terminal claim (resolved/invalidated/expired)
// is no longer actionable.
const STATUS_URGENCY = {
  STRENGTHENING: 80,
  WEAKENING: 80,
  CONTESTED: 75,
  ACTIVE: 55,
  DRAFT: 35,
  RESOLVED_CORRECT: 10,
  RESOLVED_PARTIAL: 10,
  RESOLVED_INCORRECT: 10,
  INSUFFICIENT_DATA: 10,
  INVALIDATED: 15,
  EXPIRED: 5,
};

function computeUrgencyFromClaimStatus(status) {
  return Object.prototype.hasOwnProperty.call(STATUS_URGENCY, status) ? STATUS_URGENCY[status] : null;
}

/**
 * Scores one real Claim (the canonical claimContract shape). Never
 * fabricates a factor the Claim doesn't genuinely carry — a market-wide
 * claim (no symbols) has no portfolioRelevance factor at all rather than
 * a fabricated 0.
 */
function scoreClaimAttention(claim, { heldSymbols = new Set(), now = new Date() } = {}) {
  const hasSymbols = Array.isArray(claim.symbols) && claim.symbols.length > 0;
  const isHeld = hasSymbols && claim.symbols.some((symbol) => heldSymbols.has(symbol));

  const factors = {
    portfolioRelevance: hasSymbols ? (isHeld ? 100 : 20) : null,
    confidence: Number.isFinite(claim.confidence) ? claim.confidence : null,
    probability: Number.isFinite(claim.probability) ? claim.probability : null,
    urgency: computeUrgencyFromClaimStatus(claim.status),
    freshness: computeFreshnessScore(claim.lastUpdatedAt, { now }),
    marketImpact: Number.isFinite(claim.expectedMagnitude) ? clamp(claim.expectedMagnitude, 0, 100) : null,
    supportingEngines: Array.isArray(claim.evidence)
      ? clamp(new Set(claim.evidence.map((row) => row.sourceEngine).filter(Boolean)).size * 25, 0, 100)
      : null,
    riskLevel: claim.expectedDirection === "BEARISH" && Number.isFinite(claim.confidence) ? claim.confidence : null,
  };

  return { ...computeAttentionScore(factors), isHeld };
}

// A directional, non-neutral item is inherently more time-sensitive than
// an FYI one — real derived rule from the feed item's own already-real
// impactType field, not a fabricated urgency measure.
function computeUrgencyFromImpactType(impactType) {
  if (!impactType || impactType === "neutral") return 30;
  return 60;
}

/**
 * Scores one real feed/news item. Deliberately reuses the item's own
 * already-computed `importanceScore` (autonomousMarketService) as the
 * marketImpact factor rather than recomputing a second, competing measure
 * of "how important is this event" — one canonical importance number per
 * item, never two.
 */
function scoreFeedItemAttention(item, { heldSymbols = new Set(), now = new Date() } = {}) {
  const hasAssets = Array.isArray(item.affectedAssets) && item.affectedAssets.length > 0;
  const isHeld = hasAssets && item.affectedAssets.some((symbol) => heldSymbols.has(symbol));

  const factors = {
    portfolioRelevance: hasAssets ? (isHeld ? 100 : 20) : null,
    confidence: Number.isFinite(item.confidence) ? item.confidence : null,
    urgency: computeUrgencyFromImpactType(item.impactType),
    freshness: item.publishedAt ? computeFreshnessScore(item.publishedAt, { now }) : null,
    marketImpact: Number.isFinite(item.importanceScore) ? item.importanceScore : null,
    riskLevel: item.impactType === "risk" && Number.isFinite(item.confidence) ? item.confidence : null,
  };

  return { ...computeAttentionScore(factors), isHeld };
}

module.exports = {
  FACTOR_WEIGHTS,
  computeAttentionScore,
  computeFreshnessScore,
  computeUrgencyFromClaimStatus,
  computeUrgencyFromImpactType,
  scoreClaimAttention,
  scoreFeedItemAttention,
};
