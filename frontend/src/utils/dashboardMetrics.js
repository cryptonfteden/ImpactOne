// Pure, unit-tested calculations feeding the MVP Home Dashboard. Kept out of
// JSX so risk/diversification/ranking logic can be tested directly instead
// of only through rendered component output.

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Portfolio Risk Panel §4.5 "Concentration badge" / sector exposure. A
 * simple, honest measure: how much of the portfolio sits in its single
 * largest sector. 100 means fully diversified (no positions), 0 means
 * entirely concentrated in one sector.
 */
export function computeDiversification(allocationBySector = []) {
  if (!allocationBySector.length) {
    return { largestSector: null, largestWeightPct: 0, diversificationScore: 100 };
  }

  const largest = [...allocationBySector].sort((a, b) => Number(b.pct || 0) - Number(a.pct || 0))[0];
  const largestWeightPct = Number(largest.pct || 0);

  return {
    largestSector: largest.name,
    largestWeightPct: Math.round(largestWeightPct),
    diversificationScore: clamp(Math.round(100 - largestWeightPct), 0, 100),
  };
}

/**
 * Portfolio Risk Panel §4.5 "Risk level indicator." Blends real market
 * exposure (how much of the portfolio is in open positions vs. cash),
 * sector concentration beyond a healthy threshold, and the current macro
 * regime (already fetched elsewhere via altDataApi) — not an invented
 * number, a weighted read of data the app already has.
 */
export function computeRiskScore({ positionsValue = 0, totalValue = 0, largestSectorWeightPct = 0, macroRegime = null }) {
  const exposurePct = totalValue > 0 ? (positionsValue / totalValue) * 100 : 0;
  const concentrationPenalty = Math.max(0, largestSectorWeightPct - 25);
  const recessionPenalty = macroRegime?.recessionRisk === "high" ? 15 : macroRegime?.recessionRisk === "medium" ? 5 : 0;
  const inflationPenalty = macroRegime?.inflationPressure === "high" ? 10 : macroRegime?.inflationPressure === "moderate" ? 3 : 0;

  const raw = exposurePct * 0.5 + concentrationPenalty * 0.5 + recessionPenalty + inflationPenalty;
  return clamp(Math.round(raw), 0, 100);
}

export function riskLevelLabel(riskScore) {
  if (riskScore >= 70) return "High";
  if (riskScore >= 40) return "Moderate";
  return "Low";
}

/**
 * Priority Intelligence Cards §4.4 typing: alert/opportunity/risk/catalyst.
 */
export function typePriorityCard(item) {
  if (item.impactType === "opportunity") return "opportunity";
  if (item.impactType === "risk") return "risk";
  if (["earnings", "ai", "semiconductors", "ma"].includes(item.eventType)) return "catalyst";
  return "alert";
}

/**
 * Ranks feed events into the dashboard's 3-5 Priority Intelligence Cards,
 * boosting items that are already-flagged alerts or that touch the user's
 * watchlist/portfolio — same relevance-weighting spirit as the rest of the
 * app's existing importanceScore-based ranking.
 */
export function rankPriorityCards({ feed = [], alerts = [], watchlist = [] } = {}, limit = 5) {
  const alertHeadlines = new Set(alerts.map((item) => item.headline));

  const scored = feed.map((item) => {
    const isAlert = alertHeadlines.has(item.headline);
    const touchesWatchlist = (item.relatedTickers || []).some((ticker) => watchlist.includes(ticker))
      || (item.affectedAssets || []).some((ticker) => watchlist.includes(ticker));
    const relevanceBoost = (isAlert ? 15 : 0) + (touchesWatchlist ? 10 : 0);

    return {
      ...item,
      cardType: isAlert ? "alert" : typePriorityCard(item),
      relevanceScore: clamp(Math.round(Number(item.importanceScore || 0) + relevanceBoost), 0, 100),
    };
  });

  return scored.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, limit);
}

/**
 * Watchlist Priority Panel §4.6 "biggest movers" — same sort the previous
 * DashboardHome computed inline via useMemo, extracted as a pure function.
 */
export function sortMoversByChange(rows = [], limit = 5) {
  return [...rows]
    .sort((a, b) => Math.abs(Number(b.change || 0)) - Math.abs(Number(a.change || 0)))
    .slice(0, limit);
}
