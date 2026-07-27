// Phase NEWS-INTELLIGENCE-001 — fallback-only data for the News
// Intelligence screen, used ONLY when the real fetch it stands in for
// fails. Every field mirrors the real shapes already established by
// intelligenceApi.liveFeed() (headline/whyItMatters/affectedAssets/
// confidence/impactType/attentionScore/isHeld, see FeedItemCard.jsx) and
// claimsApi.listOvernightChanges() (claimId/symbols/status/
// plainLanguageStatement, see missionControlMockData.js) — demo content
// standing in for real intelligence, never a new data model.

export const fallbackFeed = [
  {
    id: "demo-news-1",
    headline: "NVDA supplier confirms capacity expansion timeline slip",
    whyItMatters: "The delay pushes incremental supply out by a full quarter, tightening an already constrained market further than guidance implied.",
    affectedAssets: ["NVDA"],
    impactType: "risk",
    confidence: 82,
    attentionScore: 89,
    isHeld: true,
    publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    sourceName: "Supply Chain Wire",
    explainability: {
      reasoning: "Two independent supplier disclosures this week both point to the same Q3 capacity shortfall.",
      evidence: ["Supplier A's own filing confirms a one-quarter slip.", "Supplier B's capex guidance was cut in the same window."],
    },
  },
  {
    id: "demo-news-2",
    headline: "META discloses softer regional ad pricing",
    whyItMatters: "Pricing power in two major regions is fading faster than the last guidance window suggested.",
    affectedAssets: ["META"],
    impactType: "risk",
    confidence: 68,
    attentionScore: 61,
    isHeld: true,
    publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    sourceName: "Ad Exchange Data Co.",
    explainability: {
      reasoning: "CPM softening beyond normal seasonal patterns in two independently reported ad exchanges.",
      evidence: ["CPM down in the EU exchange.", "CPM down in the APAC exchange."],
    },
  },
  {
    id: "demo-news-3",
    headline: "MSFT extends Azure AI capacity commitments into next fiscal year",
    whyItMatters: "The new commitments extend the visible backlog well past the current guidance window.",
    affectedAssets: ["MSFT"],
    impactType: "opportunity",
    confidence: 85,
    attentionScore: 77,
    isHeld: true,
    publishedAt: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
    sourceName: "Cloud Capacity Monitor",
    explainability: {
      reasoning: "Real disclosed capacity commitments, not analyst projection, extend past the current guidance window.",
      evidence: ["New multi-quarter capacity agreement filed this week."],
    },
  },
  {
    id: "demo-news-4",
    headline: "XOM refining margins continue reverting to historical average",
    whyItMatters: "Nothing alarming — margins are simply normalizing after an unusually strong prior period.",
    affectedAssets: ["XOM"],
    impactType: "neutral",
    confidence: 40,
    attentionScore: 33,
    isHeld: false,
    publishedAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
    sourceName: "Refining Weekly",
    explainability: { reasoning: "Margins remain within a well-established historical range.", evidence: [] },
  },
];

export const fallbackOvernightChanges = [
  {
    claimId: "demo-hero-1",
    symbols: ["NVDA"],
    status: "STRENGTHENING",
    plainLanguageStatement: "NVDA looks set to keep beating expectations.",
  },
  {
    claimId: "demo-risk-1",
    symbols: ["META"],
    status: "WEAKENING",
    plainLanguageStatement: "META ad pricing is softening faster than guided.",
  },
];
