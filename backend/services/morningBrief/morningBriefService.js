// Phase PRODUCT-001 — the ONE canonical daily-summary service. Every
// screen's "what should I look at first" answer traces back here or to
// attentionEngine directly — never a second, screen-local summarizer.
// See MORNING_BRIEF_SPEC.md for the full contract.
const claimConsumerService = require("../claimIntelligence/claimConsumerService");
const portfolioEngineService = require("../portfolioEngineService");
const attentionEngine = require("../attentionEngine/attentionEngine");

const MIN_ITEMS = 5;
const MAX_ITEMS = 8;

function attentionLevel(score) {
  if (score >= 75) return "High";
  if (score >= 45) return "Medium";
  return "Low";
}

function claimToBriefItem(claim, scored) {
  return {
    type: "claim",
    claimId: claim.claimId,
    headline: claim.plainLanguageStatement || claim.statement,
    whyItMatters: claim.plainLanguageStatement || claim.statement || "No plain-language reasoning recorded for this Claim yet.",
    affectedAssets: claim.symbols || [],
    portfolioImpact: claim.portfolioImpact ?? null,
    confidence: Number.isFinite(claim.confidence) ? claim.confidence : null,
    attentionScore: scored.score,
    attentionExplanation: scored.explanation,
    recommendedAttentionLevel: attentionLevel(scored.score),
  };
}

function portfolioChangeToBriefItem(change, { totalValue, scored }) {
  const directionWord = Number(change.changePct) >= 0 || change.changePct === null
    ? (change.afterValue >= change.beforeValue ? "up" : "down")
    : "down";
  const pctText = change.changePct !== null ? ` (${change.changePct >= 0 ? "+" : ""}${change.changePct}%)` : "";
  const headline = `${change.label} ${directionWord}${pctText} since yesterday.`;

  return {
    type: "portfolio-change",
    dimension: change.dimension,
    headline,
    whyItMatters: `${change.label} moved from ${change.beforeValue} to ${change.afterValue}${pctText} since the last snapshot.`,
    affectedAssets: [],
    portfolioImpact: { dimension: change.dimension, beforeValue: change.beforeValue, afterValue: change.afterValue, changePct: change.changePct, totalValue },
    confidence: null,
    attentionScore: scored.score,
    attentionExplanation: scored.explanation,
    recommendedAttentionLevel: attentionLevel(scored.score),
  };
}

/**
 * Generates the day's Morning Brief: 5-8 real items, prioritized purely by
 * Attention Score. Never pads with a fabricated item to reach 5 — if fewer
 * than 5 real, scoreable items exist, the brief is honestly shorter.
 */
async function generateMorningBrief({ betaUserId, now = new Date() } = {}) {
  const [activeClaims, invalidatedClaims, portfolioSummary, performanceDelta] = await Promise.all([
    claimConsumerService.getActiveClaims({ limit: 200 }),
    claimConsumerService.getRecentlyInvalidatedClaims({ limit: 100 }),
    portfolioEngineService.getPortfolioSummary(betaUserId),
    portfolioEngineService.getPerformanceDelta(betaUserId),
  ]);

  const heldSymbols = new Set((portfolioSummary.positions || []).map((position) => position.symbol));

  const claimItems = [...activeClaims, ...invalidatedClaims].map((claim) => {
    const scored = attentionEngine.scoreClaimAttention(claim, { heldSymbols, now });
    return claimToBriefItem(claim, scored);
  });

  const portfolioChangeItems = (performanceDelta.changes || []).map((change) => {
    // A real change in the user's own portfolio is inherently 100%
    // portfolio-relevant and maximally fresh (it happened since
    // yesterday) — urgency/marketImpact scale with the real magnitude of
    // the change, never a fabricated constant.
    const magnitude = change.changePct !== null ? Math.min(100, Math.abs(change.changePct) * 10) : 60;
    const scored = attentionEngine.computeAttentionScore({
      portfolioRelevance: 100,
      freshness: 100,
      urgency: magnitude,
      marketImpact: magnitude,
    });
    return portfolioChangeToBriefItem(change, { totalValue: performanceDelta.totalValue, scored });
  });

  const items = [...claimItems, ...portfolioChangeItems]
    .sort((a, b) => b.attentionScore - a.attentionScore)
    .slice(0, MAX_ITEMS);

  return {
    generatedAt: new Date(now).toISOString(),
    items,
    itemCount: items.length,
    isBelowTargetMinimum: items.length < MIN_ITEMS,
    summary: items.length ? `${items.length} item${items.length === 1 ? "" : "s"} ranked for today.` : "No meaningful intelligence to surface yet today.",
  };
}

module.exports = { generateMorningBrief, MIN_ITEMS, MAX_ITEMS };
