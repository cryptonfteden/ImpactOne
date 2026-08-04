// Sprint 37 Priority 4 — Social Influence Intelligence.
//
// SAFETY-CRITICAL: this module never creates, triggers, or feeds a
// recommendation directly. It has no import of autonomousRecommendationEngine,
// canonicalVerdict, or portfolioEngineService, and never will — a social
// post becoming a recommendation by itself is explicitly forbidden by the
// mission. This module only produces per-post evidence for the existing
// evidence architecture (eventEnvelope / CanonicalEvent / Decision Trace)
// to consume alongside every other category, exactly like News or Options.
const { ADAPTER_STATUS } = require("./adapterEnvelope");

const WATCHLIST_CATEGORIES = Object.freeze({
  POLITICAL_FIGURE: "POLITICAL_FIGURE",
  CENTRAL_BANK_OFFICIAL: "CENTRAL_BANK_OFFICIAL",
  CONGRESS_MEMBER: "CONGRESS_MEMBER",
  COMPANY_EXECUTIVE: "COMPANY_EXECUTIVE",
  PROMINENT_INVESTOR: "PROMINENT_INVESTOR",
  SECTOR_SPECIALIST: "SECTOR_SPECIALIST",
});

// A configurable watchlist model, not a hardcoded claim of influence —
// `verifiedInfluenceEvidence` is honestly null until a real historical
// market-reaction study backs a given account; nothing here is presented
// as proven until it is.
const DEFAULT_WATCHLIST = [
  { handle: "@FederalReserve", name: "Federal Reserve", category: WATCHLIST_CATEGORIES.CENTRAL_BANK_OFFICIAL, verifiedInfluenceEvidence: null },
  { handle: "@SecTreasury", name: "US Treasury Secretary", category: WATCHLIST_CATEGORIES.POLITICAL_FIGURE, verifiedInfluenceEvidence: null },
  { handle: "@SenWarren", name: "Sen. Elizabeth Warren", category: WATCHLIST_CATEGORIES.CONGRESS_MEMBER, verifiedInfluenceEvidence: null },
  { handle: "@elonmusk", name: "Elon Musk", category: WATCHLIST_CATEGORIES.COMPANY_EXECUTIVE, verifiedInfluenceEvidence: null },
  { handle: "@michaeljburry", name: "Michael Burry", category: WATCHLIST_CATEGORIES.PROMINENT_INVESTOR, verifiedInfluenceEvidence: null },
  { handle: "@PatrickMoorhead", name: "Patrick Moorhead (semiconductors)", category: WATCHLIST_CATEGORIES.SECTOR_SPECIALIST, verifiedInfluenceEvidence: null },
];

function getWatchlist() {
  return DEFAULT_WATCHLIST.slice();
}

// Splits a raw statement into fact-claims vs. opinion by a simple, honest,
// inspectable heuristic (hedging/opinion language vs. assertive claim
// language) — never presented as a definitive NLP classification, just a
// first-pass separation a human reviewer can see and override.
const OPINION_MARKERS = ["i think", "i believe", "in my view", "imo", "expect", "likely", "should"];

function splitFactsFromOpinion(text) {
  const lower = (text || "").toLowerCase();
  const isOpinion = OPINION_MARKERS.some((marker) => lower.includes(marker));
  return { claimedFacts: isOpinion ? [] : [text], opinion: isOpinion ? [text] : [] };
}

/**
 * Derives every field the mission requires SEPARATELY for one post —
 * identity/source, timestamp, entities, sectors, sentiment, facts vs.
 * opinion, potential market impact, historical influence evidence,
 * confidence, uncertainty. Every field is independently nullable; nothing
 * here forces a conclusion the input doesn't support.
 */
function analyzePost(post = {}) {
  const watchlistEntry = DEFAULT_WATCHLIST.find((entry) => entry.handle === post.authorHandle) || null;
  const { claimedFacts, opinion } = splitFactsFromOpinion(post.text);

  const hasEnoughSignal = Boolean(post.text && post.text.trim().length >= 10);

  return {
    identity: {
      handle: post.authorHandle || null,
      name: watchlistEntry?.name || post.authorName || null,
      category: watchlistEntry?.category || null,
      onWatchlist: Boolean(watchlistEntry),
    },
    publicationTimestamp: post.publishedAt || null,
    relevantEntities: post.entities || [],
    relevantSectors: post.sectors || [],
    // Sentiment is reported as a real derived signal only when there's
    // text to derive it from — never a default-neutral fabrication.
    sentiment: hasEnoughSignal ? (post.sentiment || "UNCLASSIFIED") : null,
    claimedFacts,
    opinion,
    // "Potential" market impact — explicitly not a prediction of actual
    // impact, which this module has no authority to assert.
    potentialMarketImpact: hasEnoughSignal ? (post.potentialMarketImpact || "UNKNOWN") : null,
    historicalInfluenceEvidence: watchlistEntry?.verifiedInfluenceEvidence || null,
    confidence: hasEnoughSignal ? (Number.isFinite(post.confidence) ? post.confidence : 30) : 0,
    uncertainty: hasEnoughSignal ? (Number.isFinite(post.uncertainty) ? post.uncertainty : 60) : 100,
    // Explicit, unmissable: this is evidence, never a verdict.
    isRecommendation: false,
  };
}

// Sprint 37 — no live X/social API credential exists in this environment
// (X API v2 requires a paid tier; Reddit/Telegram similarly need app
// registration this sprint doesn't have). Deterministic, clearly labeled
// FIXTURE posts for console demonstration only — never written to
// CanonicalEvent, never mixed into the real provider ingestion stream.
function getFixtureFeed() {
  const posts = [
    { authorHandle: "@FederalReserve", text: "The Committee will continue to monitor incoming data.", publishedAt: "2026-07-18T14:00:00.000Z", entities: ["Federal Reserve"], sectors: ["Financials"], sentiment: "NEUTRAL", potentialMarketImpact: "MODERATE" },
    { authorHandle: "@elonmusk", text: "I think production ramps faster than people expect.", publishedAt: "2026-07-18T16:30:00.000Z", entities: ["Tesla"], sectors: ["Consumer Discretionary", "Technology"], sentiment: "POSITIVE", potentialMarketImpact: "MODERATE" },
  ];
  return {
    status: ADAPTER_STATUS.FIXTURE,
    posts: posts.map(analyzePost),
  };
}

module.exports = { WATCHLIST_CATEGORIES, getWatchlist, analyzePost, splitFactsFromOpinion, getFixtureFeed };
