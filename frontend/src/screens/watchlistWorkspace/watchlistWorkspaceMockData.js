// Phase WATCHLIST-001 — fallback-only data for the Watchlist Workspace,
// used ONLY when the real fetch it stands in for fails. Every field
// mirrors the real shape already established by
// intelligenceApi.watchlistPriority() (symbol/opportunityScore/riskScore/
// overallAiScore/explanation/primaryDriver/currentPrice/dayChangePercent
// — see backend/services/autonomousMarketService.js's buildWatchlistRanks)
// — demo content standing in for real intelligence, never a new data
// model. The overnight-changes fallback is intentionally the same shared
// shape newsIntelligenceMockData.js already uses for the identical real
// call (claimsApi.listOvernightChanges) — reused directly below rather
// than redefined a third time.

export { fallbackOvernightChanges } from "../newsIntelligence/newsIntelligenceMockData";

export const fallbackRankings = [
  {
    symbol: "NVDA",
    opportunityScore: 88,
    riskScore: 35,
    momentum: 82,
    overallAiScore: 91,
    primaryDriver: "NVDA demand outpaces supply through Q3",
    explanation: "Real-time options flow and analyst revisions both point the same direction — capacity, not demand, is now the binding constraint.",
    currentPrice: 480.12,
    dayChangePercent: 1.8,
  },
  {
    symbol: "META",
    opportunityScore: 40,
    riskScore: 66,
    momentum: 38,
    overallAiScore: 58,
    primaryDriver: "META ad pricing softens into the new quarter",
    explanation: "Two independent evidence sources now agree pricing power is fading faster than guidance implied.",
    currentPrice: 421.5,
    dayChangePercent: -0.9,
  },
  {
    symbol: "AMD",
    opportunityScore: 60,
    riskScore: 42,
    momentum: 51,
    overallAiScore: 49,
    primaryDriver: "AMD foundry diversification reduces single-supplier exposure",
    explanation: "A new sourcing disclosure meaningfully lowers the single-point-of-failure risk flagged last quarter.",
    currentPrice: 168.4,
    dayChangePercent: 0.4,
  },
];
