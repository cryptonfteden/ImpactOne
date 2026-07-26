// Phase PORTFOLIO-001 — deterministic fallback data for Portfolio
// Workspace, mirroring Mission Control's exact Demo Mode pattern
// (missionControlMockData.js). Used ONLY when a specific real service
// call fails — never a default preferred over real data, and never
// shown without the Demo Mode indicator disclosing it. Shapes mirror the
// real portfolioEngineApi.getSummary()/getPerformanceDelta() and
// claimsApi.listPortfolioRelevant() response contracts exactly.

export const fallbackSummary = {
  cashBalance: 12500,
  startingCapital: 100000,
  positionsValue: 92000,
  totalValue: 104500,
  realizedPnl: 1800,
  unrealizedPnl: 6200,
  dailyPnl: 420,
  totalReturn: 4500,
  totalReturnPct: 4.5,
  positions: [
    { id: "demo-p1", symbol: "NVDA", sector: "Technology", assetType: "equity", quantity: 50, avgEntryPrice: 400, currentPrice: 480, marketValue: 24000, unrealizedPnl: 4000, unrealizedPnlPct: 20 },
    { id: "demo-p2", symbol: "META", sector: "Technology", assetType: "equity", quantity: 40, avgEntryPrice: 500, currentPrice: 460, marketValue: 18400, unrealizedPnl: -1600, unrealizedPnlPct: -8 },
    { id: "demo-p3", symbol: "XOM", sector: "Energy", assetType: "equity", quantity: 300, avgEntryPrice: 100, currentPrice: 116, marketValue: 34800, unrealizedPnl: 4800, unrealizedPnlPct: 16 },
  ],
  allocation: {
    bySector: [
      { name: "Technology", value: 42400, pct: 46 },
      { name: "Energy", value: 34800, pct: 37.8 },
    ],
    byAssetType: [{ name: "equity", value: 92000, pct: 100 }],
  },
};

export const fallbackDelta = {
  hasComparison: true,
  totalValue: 104500,
  valueChangeAbs: 1300,
  valueChangePct: 1.26,
  changes: [{ dimension: "totalValue", label: "Total portfolio value", beforeValue: 103200, afterValue: 104500, changePct: 1.26 }],
  summary: "Portfolio value up 1.26% since the last snapshot.",
};

export const fallbackPortfolioClaims = [
  {
    claimId: "demo-portfolio-claim-1",
    symbols: ["NVDA"],
    expectedDirection: "BULLISH",
    confidence: 82,
    probability: 68,
    attentionScore: 74,
    status: "STRENGTHENING",
    statement: "NVDA demand outpaces supply through Q3.",
    plainLanguageStatement: "NVDA looks set to keep beating expectations.",
    portfolioImpact: { magnitude: 70, direction: "positive" },
    evidence: [{ id: "e1", observedFact: "Real options sweep activity confirms continued institutional accumulation." }],
    counterEvidence: [],
  },
  {
    claimId: "demo-portfolio-claim-2",
    symbols: ["META"],
    expectedDirection: "BEARISH",
    confidence: 66,
    probability: 55,
    attentionScore: 58,
    status: "WEAKENING",
    statement: "META advertising pricing power is weakening faster than guided.",
    plainLanguageStatement: "META ad pricing is softening faster than the company has guided for.",
    portfolioImpact: { magnitude: 48, direction: "negative" },
    evidence: [{ id: "e2", observedFact: "Two independent ad-exchange data providers show CPM softening beyond seasonal norms." }],
    counterEvidence: [],
  },
];
