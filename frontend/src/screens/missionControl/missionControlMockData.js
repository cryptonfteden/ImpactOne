// Phase MISSION-CONTROL-001 — deterministic demo data for the first
// production-quality Mission Control screen. Per the phase mission ("do
// not wait for live APIs, use deterministic mock data — the goal is
// validating the experience"), this module is the sole data source for
// this screen: no network calls, no randomness, no wall-clock reads. The
// same import always produces the exact same screen, so the experience
// (layout, hierarchy, motion, Confidence Arc) can be reviewed and tested
// without depending on a live backend or a seeded database.
//
// Every field mirrors the REAL shapes already established by prior
// phases' canonical services (claimContract.js's Claim shape,
// morningBriefService's Brief item shape, portfolioEngineService's
// getPerformanceDelta shape) — this is demo content standing in for real
// intelligence, not a new data model.

export const heroBriefItem = {
  claimId: "demo-hero-1",
  type: "claim",
  headline: "NVDA demand outpaces supply through Q3",
  whyItMatters: "Real-time options flow and analyst revisions both point the same direction — capacity, not demand, is now the binding constraint.",
  affectedAssets: ["NVDA"],
  attentionScore: 91,
  attentionExplanation: "Ranked 91/100, driven mainly by portfolio relevance (100), confidence (88), and freshness (96).",
  recommendedAttentionLevel: "High",
  confidence: 88,
};

export const todaysBrief = [
  heroBriefItem,
  {
    claimId: "demo-brief-2",
    type: "claim",
    headline: "META ad pricing softens into the new quarter",
    whyItMatters: "Two independent evidence sources now agree pricing power is fading faster than guidance implied.",
    affectedAssets: ["META"],
    attentionScore: 74,
    attentionExplanation: "Ranked 74/100, driven mainly by confidence (70), urgency (75).",
    recommendedAttentionLevel: "Medium",
    confidence: 70,
  },
  {
    claimId: "demo-brief-3",
    type: "portfolio-change",
    dimension: "totalValue",
    headline: "Total portfolio value up 1.8% since yesterday",
    whyItMatters: "Total portfolio value moved from $148,200 to $150,868 (+1.8%) since the last snapshot.",
    affectedAssets: [],
    attentionScore: 68,
    attentionExplanation: "Ranked 68/100, driven mainly by portfolio relevance (100), freshness (100).",
    recommendedAttentionLevel: "Medium",
    confidence: null,
  },
  {
    claimId: "demo-brief-4",
    type: "claim",
    headline: "AMD foundry diversification reduces single-supplier exposure",
    whyItMatters: "A new sourcing disclosure meaningfully lowers the single-point-of-failure risk flagged last quarter.",
    affectedAssets: ["AMD"],
    attentionScore: 55,
    attentionExplanation: "Ranked 55/100, driven mainly by confidence (62), freshness (70).",
    recommendedAttentionLevel: "Medium",
    confidence: 62,
  },
  {
    claimId: "demo-brief-5",
    type: "claim",
    headline: "XOM refining margins normalize toward historical average",
    whyItMatters: "Nothing alarming — margins are simply reverting to a well-established historical range.",
    affectedAssets: ["XOM"],
    attentionScore: 38,
    attentionExplanation: "Ranked 38/100, driven mainly by freshness (80), confidence (35).",
    recommendedAttentionLevel: "Low",
    confidence: 35,
  },
];

export const portfolioIntelligence = {
  hasComparison: true,
  totalValue: 150868,
  valueChangePct: 1.8,
  summary: "Portfolio value up 1.8% since the last snapshot.",
  changes: [
    { dimension: "totalValue", label: "Total portfolio value", beforeValue: 148200, afterValue: 150868, changePct: 1.8 },
    { dimension: "unrealizedPnl", label: "Unrealized P/L", beforeValue: 4200, afterValue: 5940, changePct: null },
  ],
  claimsAffectingPortfolio: 3,
  topAffectedHoldings: ["NVDA", "META"],
};

export const biggestRisk = {
  claimId: "demo-risk-1",
  symbols: ["META"],
  expectedDirection: "BEARISH",
  confidence: 70,
  status: "WEAKENING",
  statement: "META advertising pricing power is weakening faster than guided.",
  plainLanguageStatement: "META ad pricing is softening faster than the company has guided for.",
  evidence: [{ id: "e1", observedFact: "Two independent ad-exchange data providers show CPM softening beyond seasonal norms." }],
  portfolioImpact: { magnitude: 62, direction: "negative" },
};

export const bestOpportunity = {
  claimId: "demo-opportunity-1",
  symbols: ["NVDA"],
  expectedDirection: "BULLISH",
  confidence: 88,
  status: "STRENGTHENING",
  statement: "NVDA demand outpaces available supply through Q3.",
  plainLanguageStatement: "NVDA looks set to keep beating expectations as supply, not demand, becomes the limiting factor.",
  evidence: [{ id: "e2", observedFact: "Real options sweep activity confirms continued institutional accumulation." }],
  portfolioImpact: { magnitude: 74, direction: "positive" },
};

export const claimsChanging = [
  {
    claimId: "demo-hero-1",
    symbols: ["NVDA"],
    status: "STRENGTHENING",
    plainLanguageStatement: "NVDA looks set to keep beating expectations.",
    reason: "Supply-constraint evidence strengthened overnight from a second independent source.",
  },
  {
    claimId: "demo-risk-1",
    symbols: ["META"],
    status: "WEAKENING",
    plainLanguageStatement: "META ad pricing is softening faster than guided.",
    reason: "New evidence contradicted part of the prior pricing-power thesis.",
  },
  {
    claimId: "demo-invalidated-1",
    symbols: ["INTC"],
    status: "INVALIDATED",
    plainLanguageStatement: "INTC foundry ramp was expected to miss its own timeline.",
    reason: "A real invalidation condition was triggered: the company confirmed the ramp is on schedule.",
  },
];

export const marketPulse = {
  market: "US",
  score: 58,
  confidence: 64,
  missingInputs: [],
  summary: "Market-wide sentiment is mildly risk-on, with moderate confidence.",
};

export const upcomingEvents = [
  { symbol: "NVDA", date: "2026-08-14", label: "Q2 earnings", comparisonPoint: "Consensus EPS $0.68" },
  { symbol: "META", date: "2026-08-21", label: "Q2 earnings", comparisonPoint: null },
];

export const liveIntelligenceCount = 14;

export const sessionSummary = {
  highAttentionCount: 1,
  mediumAttentionCount: 2,
  lowAttentionCount: 2,
};
