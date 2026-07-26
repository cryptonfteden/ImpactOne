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
//
// Phase MISSION-CONTROL-002 — `isDemoData` is the one flag the screen
// reads to decide whether to show the Demo Mode indicator (see
// MissionControlHomeScreen.jsx). It is true for as long as this file
// remains the screen's data source; the day this module is replaced by
// real API calls, flipping this constant (or removing it in favor of a
// real "is this real or simulated" signal from the backend) is the only
// change needed to turn the indicator off — never a place where "demo"
// and "live" data can be silently confused.
export const isDemoData = true;

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

// Phase MISSION-CONTROL-002 — deliberately a different symbol from the
// Tier 1 hero (previously both were NVDA; flagged by
// MISSION_CONTROL_UI_GAPS.md, M3, as reading like unintentional
// repetition rather than reinforcement). Best Opportunity should
// showcase a genuinely distinct real finding, not restate the hero.
export const bestOpportunity = {
  claimId: "demo-opportunity-1",
  symbols: ["MSFT"],
  expectedDirection: "BULLISH",
  confidence: 88,
  status: "STRENGTHENING",
  statement: "MSFT Azure AI compute backlog signals durable, multi-quarter growth.",
  plainLanguageStatement: "MSFT's Azure AI backlog looks set to keep beating expectations well beyond this quarter.",
  evidence: [{ id: "e2", observedFact: "Real capacity commitments disclosed this quarter extend well past the current guidance window." }],
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

// Phase MISSION-CONTROL-002 — an "upcomingEvents" export previously
// existed here but was never rendered by MissionControlHomeScreen.jsx
// (dead code, flagged by MISSION_CONTROL_UI_GAPS.md, H3). This is a
// deliberate, documented cut, not an oversight: MISSION-CONTROL-001's
// explicit screen layout only specifies Tier 3 as Claims Changing /
// Market Pulse / Live Intelligence / Session Summary — Upcoming Events
// was never part of this build's scope. Removed rather than left unused,
// per this phase's "no unfinished components" release-readiness bar; a
// future phase that wants an Upcoming Events section should treat that
// as new scope, not silently revive dead code.

export const liveIntelligenceCount = 14;

export const sessionSummary = {
  highAttentionCount: 1,
  mediumAttentionCount: 2,
  lowAttentionCount: 2,
};
