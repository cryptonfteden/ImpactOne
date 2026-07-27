// Phase PERSONAL-INTELLIGENCE-001 — fallback-only data for the Personal
// Intelligence Workspace, used ONLY when a real fetch it stands in for
// fails (the real Investor Profile itself is never faked — see the
// screen's honest "complete your profile" gate for that case). Every
// field mirrors the real shape already established by
// personalizationService.js's getPersonalizationProfile and
// intelligenceApi.watchlistPriority() — demo content standing in for
// real intelligence, never a new data model.

export const fallbackPersonalization = {
  preferredSectors: [
    { key: "Technology", count: 3 },
    { key: "Financials", count: 1 },
  ],
  preferredMarketCapExposure: [{ key: "equity", count: 4 }],
};

export const fallbackWatchlistRankings = [
  {
    symbol: "NVDA",
    opportunityScore: 88,
    riskScore: 35,
    overallAiScore: 91,
    primaryDriver: "NVDA demand outpaces supply through Q3",
    explanation: "Real-time options flow and analyst revisions both point the same direction — capacity, not demand, is now the binding constraint.",
  },
];

export const fallbackClaims = [
  {
    claimId: "demo-personal-1",
    symbols: ["NVDA"],
    sectors: ["Technology"],
    expectedDirection: "BULLISH",
    confidence: 88,
    status: "STRENGTHENING",
    statement: "NVDA demand outpaces supply through Q3.",
    plainLanguageStatement: "NVDA looks set to keep beating expectations — capacity, not demand, is the real constraint.",
    evidence: [{ id: "e1", observedFact: "Two independent supplier disclosures confirm capacity remains the binding constraint." }],
    counterEvidence: [],
    invalidationConditions: ["A supplier discloses spare capacity materially above current guidance."],
    confirmationConditions: ["Next earnings call reaffirms the current capacity guidance."],
    reasoning: { observed: ["Two independent supplier disclosures confirm capacity is the binding constraint."], inferred: ["Demand is not the limiting factor this quarter."] },
  },
  {
    claimId: "demo-personal-2",
    symbols: ["META"],
    sectors: ["Technology"],
    expectedDirection: "BEARISH",
    confidence: 70,
    status: "WEAKENING",
    statement: "META advertising pricing power is weakening faster than guided.",
    plainLanguageStatement: "META ad pricing is softening faster than the company has guided for.",
    evidence: [{ id: "e2", observedFact: "Two independent ad-exchange data providers show CPM softening beyond seasonal norms." }],
    counterEvidence: [],
    invalidationConditions: ["CPM stabilizes within the next reporting window."],
    confirmationConditions: ["A third ad-exchange data provider corroborates the same softening."],
    reasoning: { observed: ["CPM softening beyond seasonal norms across two providers."], inferred: ["Pricing power is fading faster than guidance implied."] },
  },
];
