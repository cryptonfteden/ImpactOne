// Sprint 20, Part 3 — the Home Screen's question aggregation. New,
// deliberately not folded into the already-large autonomousMarketService.js.
// This module never computes its own verdict: "Should I do anything today?"
// is answered only by looking up a real, already-persisted Recommendation
// and reading it through canonicalVerdict.buildCanonicalVerdictView — the
// same Sprint 18A function that guarantees exactly one canonical action.
//
// Sprint 24 extended this from four questions to six ("what changed since
// yesterday," "what changed for my portfolio," "what changed in the
// platform's beliefs") — each one reuses an existing, real data source
// (dailyBriefService's own day-over-day comparison, portfolioEngineService's
// PerformanceSnapshot delta, and WorldMemoryThesisRevision) rather than
// inventing a fourth "what changed" computation from scratch.
const autonomousMarketService = require("./autonomousMarketService");
const portfolioEngineService = require("./portfolioEngineService");
const autonomousRecommendationRepository = require("./autonomousRecommendationRepository");
const canonicalVerdict = require("./canonicalVerdict");
const dailyBriefService = require("./dailyBriefService");
const worldMemoryRepository = require("./worldMemoryRepository");
const { THEME_DEFINITIONS } = require("./themeIntelligenceService");

const BELIEF_CHANGE_LOOKBACK_MS = 48 * 60 * 60 * 1000;

function normalizeSymbolList(values = []) {
  return Array.from(new Set((values || []).map((value) => String(value || "").trim().toUpperCase()).filter(Boolean)));
}

function touchedSymbols(event) {
  return [...(event?.relatedTickers || []), ...(event?.affectedAssets || [])];
}

/**
 * Prefers an event that touches something the user actually holds or
 * watches over the market's single most "important" headline — a market-
 * wide event that doesn't touch the user's world is a worse answer to
 * "what happened" on a personal home screen than a smaller one that does.
 */
function pickMostRelevantEvent(feed, { heldSymbols, watchlistSymbols }) {
  if (!feed?.length) {
    return null;
  }
  const personal = feed.find((event) => touchedSymbols(event).some((symbol) => heldSymbols.includes(symbol) || watchlistSymbols.includes(symbol)));
  return personal || feed[0];
}

function buildHowDoesItAffectMe({ event, heldSymbols, watchlistSymbols, positions, totalValue }) {
  if (!event) {
    return { text: "Nothing significant to report — your portfolio and watchlist are unaffected today.", relevantSymbol: null };
  }

  const touched = touchedSymbols(event);
  const heldMatch = touched.find((symbol) => heldSymbols.includes(symbol));
  if (heldMatch) {
    const position = positions.find((item) => item.symbol === heldMatch);
    const weightPct = position && totalValue > 0 ? (Number(position.marketValue) / totalValue) * 100 : 0;
    return { text: `Directly affects ${heldMatch} — ${Math.round(weightPct)}% of your portfolio.`, relevantSymbol: heldMatch };
  }

  const watchlistMatch = touched.find((symbol) => watchlistSymbols.includes(symbol));
  if (watchlistMatch) {
    return { text: `${watchlistMatch} is on your watchlist.`, relevantSymbol: watchlistMatch };
  }

  return { text: "This doesn't directly affect your current holdings or watchlist.", relevantSymbol: null };
}

async function buildShouldIDoAnythingToday({ relevantSymbol, heldSymbols }) {
  const candidateSymbols = relevantSymbol ? [relevantSymbol, ...heldSymbols] : heldSymbols;

  for (const symbol of candidateSymbols) {
    const recommendation = await autonomousRecommendationRepository.getActiveForSymbol(symbol);
    if (recommendation) {
      const verdict = canonicalVerdict.buildCanonicalVerdictView({ recommendation });
      return {
        hasAction: true,
        action: verdict.action,
        symbol: recommendation.symbol,
        recommendationId: recommendation.id,
        reasoning: recommendation.reasoning,
        qualityScore: verdict.qualityScore,
      };
    }
  }

  return { hasAction: false, action: null, symbol: null, recommendationId: null, reasoning: null, qualityScore: null };
}

/**
 * Sprint 24 — reuses dailyBriefService's own existing day-over-day
 * comparison (buildChangedSinceYesterday) rather than computing a second,
 * competing one. Best-effort: the daily brief pipeline calls several live
 * providers, so a failure here degrades to an honest empty list, never a
 * broken Home screen.
 */
async function buildWhatChangedSinceYesterday(watchlist) {
  try {
    const brief = await dailyBriefService.getDailyBrief({ watchlist });
    return brief.whatChangedSinceYesterday || [];
  } catch (error) {
    return [];
  }
}

/**
 * Reuses portfolioEngineService.getPerformanceDelta directly — Home never
 * computes its own portfolio comparison.
 */
async function buildWhatChangedForMyPortfolio() {
  const delta = await portfolioEngineService.getPerformanceDelta();
  return {
    hasComparison: delta.hasComparison,
    summary: delta.summary,
    changes: delta.changes,
  };
}

/**
 * Reads real WorldMemoryThesisRevision rows (Sprint 24 gave this table its
 * first writer) — an honest empty array when no theme's thesis has
 * actually changed in the lookback window, never a fabricated "nothing
 * changed" narrative standing in for missing data.
 */
async function buildWhatChangedInBeliefs() {
  const since = new Date(Date.now() - BELIEF_CHANGE_LOOKBACK_MS);
  const revisions = await worldMemoryRepository.listRecentThesisRevisions({ since, limit: 5 });
  return revisions.map((revision) => ({
    themeKey: revision.themeKey,
    themeLabel: THEME_DEFINITIONS[revision.themeKey]?.label || revision.themeKey,
    changedAt: revision.changedAt,
    newThesis: revision.newThesis,
  }));
}

async function buildHomeSummary({ watchlist = [] } = {}) {
  const normalizedWatchlist = normalizeSymbolList(watchlist);
  const portfolioSummary = await portfolioEngineService.getPortfolioSummary();
  const heldSymbols = portfolioSummary.positions.map((position) => position.symbol);

  const universe = Array.from(new Set([...heldSymbols, ...normalizedWatchlist, ...autonomousMarketService.DEFAULT_WATCHLIST]));
  const overview = await autonomousMarketService.getAutonomousOverview({
    watchlist: universe,
    portfolioContext: { heldSymbols, watchlistSymbols: normalizedWatchlist },
  });

  const event = pickMostRelevantEvent(overview.feed, { heldSymbols, watchlistSymbols: normalizedWatchlist });
  const { text: howDoesItAffectMe, relevantSymbol } = buildHowDoesItAffectMe({
    event,
    heldSymbols,
    watchlistSymbols: normalizedWatchlist,
    positions: portfolioSummary.positions,
    totalValue: portfolioSummary.totalValue,
  });
  const shouldIDoAnythingToday = await buildShouldIDoAnythingToday({ relevantSymbol, heldSymbols });

  // Sprint 24 — the three additional questions run independently of the
  // original four and of each other; a failure in one (e.g. the daily
  // brief's live provider calls) must never take down the whole screen.
  const [whatChangedSinceYesterday, whatChangedForMyPortfolio, whatChangedInBeliefs] = await Promise.all([
    buildWhatChangedSinceYesterday(universe),
    buildWhatChangedForMyPortfolio(),
    buildWhatChangedInBeliefs(),
  ]);

  return {
    whatHappened: {
      headline: event?.headline || "No major market-moving events detected right now.",
      sourceName: event?.sourceName || null,
      sourceUrl: event?.sourceUrl || null,
    },
    whyShouldICare: event?.whyItMatters || "Markets are calm — nothing urgent stands out today.",
    howDoesItAffectMe,
    whatChangedSinceYesterday,
    whatChangedForMyPortfolio,
    whatChangedInBeliefs,
    shouldIDoAnythingToday,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  buildHomeSummary,
};
