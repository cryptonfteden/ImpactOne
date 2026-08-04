// Phase DEDUPLICATION-001 — the one shared home for Claim-status
// presentation and correlation logic that Mission Control, News
// Intelligence, and the Daily Feed each independently reimplemented
// (PLATFORM_DUPLICATION_AUDIT.md, D1/D2/D3). Any future change to a
// status label, an attention threshold, or the overnight-change
// correlation rule now has exactly one place to change — every consumer
// picks it up automatically.

// D1 — byte-identical between MissionControlHomeScreen.jsx and
// NewsIntelligenceScreen.jsx before this phase.
export function statusTone(status) {
  if (status === "STRENGTHENING") return "positive";
  if (status === "WEAKENING") return "warning";
  if (status === "INVALIDATED") return "neutral";
  return "info";
}

export function statusPlainLabel(status) {
  if (status === "STRENGTHENING") return "Getting more likely";
  if (status === "WEAKENING") return "Getting less likely";
  if (status === "INVALIDATED") return "No longer holds up";
  return status;
}

// D2 — identical >=75/>=45 thresholds, previously named
// `recommendedAttentionLevel` in Mission Control and
// `attentionLevelForScore` in News Intelligence. One name, one
// threshold, going forward.
export function attentionLevel(score) {
  if (!Number.isFinite(score)) return "Low";
  if (score >= 75) return "High";
  if (score >= 45) return "Medium";
  return "Low";
}

// D3 — the canonical "what changed since yesterday" correlation between
// a news/feed item's real affected symbols and a real Claim's status
// transition. This is FeedItemCard.jsx's original, more rigorous
// implementation (real RECENT_TRANSITION_WINDOW_MS check, honest
// causal-vs-correlative language per transition type) — News
// Intelligence's own independent, simpler reimplementation
// (`describeOvernightChange`) is replaced by this shared version rather
// than the other way around, since this one is the more carefully
// reasoned of the two and neither screen should settle for less.
const RECENT_TRANSITION_WINDOW_MS = 48 * 60 * 60 * 1000;

export function computeChangedClaimsText(item, activeClaims) {
  const symbols = item.affectedAssets || [];
  if (!symbols.length || !activeClaims?.length) return "No active Claims affected.";

  const overlapping = activeClaims.filter((claim) => claim.symbols?.some((symbol) => symbols.includes(symbol)));
  if (!overlapping.length) return "No active Claims affected.";

  const publishedAt = item.publishedAt ? new Date(item.publishedAt).getTime() : null;
  const descriptions = overlapping.slice(0, 3).map((claim) => {
    const label = claim.plainLanguageStatement || claim.statement || "an active Claim";
    const updatedAt = claim.lastUpdatedAt ? new Date(claim.lastUpdatedAt).getTime() : null;
    const isRecentTransition = Boolean(publishedAt && updatedAt && Math.abs(updatedAt - publishedAt) <= RECENT_TRANSITION_WINDOW_MS);

    if (claim.status === "INVALIDATED" && isRecentTransition) return `This news invalidated a Claim: "${label}".`;
    if (claim.status === "DRAFT" && isRecentTransition) return `This news created a Claim: "${label}".`;
    if (claim.status === "STRENGTHENING" && isRecentTransition) return `This news strengthened a Claim: "${label}".`;
    if (claim.status === "WEAKENING" && isRecentTransition) return `This news weakened a Claim: "${label}".`;
    return `This news relates to an active Claim: "${label}" (same symbol, no confirmed recent transition).`;
  });
  return descriptions.join(" ");
}
