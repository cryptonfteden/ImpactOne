// Phase MARKET-INTELLIGENCE-001 — fallback-only data for the Market
// Intelligence Workspace, used ONLY when the real fetch it stands in
// for fails. Every field mirrors the real shape already established by
// marketSentimentApi.getOverview() and intelligenceApi.liveFeed()/
// globalMap() (see backend/services/autonomousMarketService.js's
// buildGlobalMap) — demo content standing in for real intelligence,
// never a new data model. The overnight-changes fallback reuses the
// same shared shape newsIntelligenceMockData.js already defines for the
// identical real call.

export { fallbackOvernightChanges } from "../newsIntelligence/newsIntelligenceMockData";

export const fallbackSentiment = {
  market: "US",
  score: 58,
  confidence: 64,
  trend: "up",
  missingInputs: [],
};

export const fallbackFeed = [
  { id: "demo-mi-1", headline: "AI infrastructure demand remains strong", affectedSectors: ["Technology", "Semiconductors"], impactType: "opportunity", importanceScore: 82 },
  { id: "demo-mi-2", headline: "Regional bank deposits stabilize", affectedSectors: ["Financials"], impactType: "opportunity", importanceScore: 61 },
  { id: "demo-mi-3", headline: "Consumer discretionary spending softens", affectedSectors: ["Consumer Discretionary"], impactType: "risk", importanceScore: 70 },
  { id: "demo-mi-4", headline: "Energy prices under pressure from oversupply", affectedSectors: ["Energy"], impactType: "risk", importanceScore: 66 },
];

export const fallbackGlobalMap = {
  majorGlobalEvents: [
    { headline: "Central bank signals a slower pace of tightening", countries: ["United States"], sectors: ["Financials"], score: 78 },
    { headline: "Cross-border supply chain disruption easing", countries: ["China", "United States"], sectors: ["Technology"], score: 65 },
  ],
  capitalFlows: [
    { from: "Bonds", to: "Technology", rationale: "Falling real yields are pulling capital back toward growth equities." },
    { from: "Energy", to: "Financials", rationale: "Rotation out of commodity-sensitive names into rate-sensitive financials." },
  ],
  macroRegime: "Risk-on, moderate conviction",
};
