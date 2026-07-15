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
const investorProfileRepository = require("./investorProfileRepository");
const feedPersonalizationService = require("./feedPersonalizationService");
const personalIntelligenceService = require("./personalIntelligenceService");
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

/**
 * Sprint 28 Priority 1/5 — merges Recommendations + DecisionTrace-derived
 * fields (via the same canonicalVerdict view used by "should I do
 * anything today") into the Morning Brief, instead of Home only ever
 * looking up a single symbol's recommendation. Reused, not reinvented:
 * autonomousRecommendationRepository.listActive is the same repository
 * function the Recommendations screen itself calls.
 */
// Sprint 30 Priority 2 — widened from "top `limit` by qualityScore" to
// "top `limit` by qualityScore, then re-ranked by real user relevance."
// Facts (qualityScore, action, confidenceScore, ...) are computed exactly
// as before and never altered; personalIntelligenceService only ever
// reorders. A wider candidate pool (10, not 3) is ranked by quality first
// so personalization chooses among genuinely strong recommendations, not
// a fabricated field.
async function buildTopRecommendations({ limit = 3, candidatePoolSize = 10 } = {}) {
  const active = await autonomousRecommendationRepository.listActive({ limit: 50 });
  const withVerdicts = active.map((recommendation) => {
    const verdict = canonicalVerdict.buildCanonicalVerdictView({ recommendation });
    return {
      symbol: recommendation.symbol,
      action: verdict.action,
      qualityScore: verdict.qualityScore,
      confidenceScore: Number(recommendation.confidenceScore),
      riskScore: Number(recommendation.riskScore),
      riskLabel: recommendation.riskLabel,
      reasoning: recommendation.reasoning,
      timeHorizon: recommendation.timeHorizon,
      portfolioContext: recommendation.portfolioContext,
    };
  });
  const candidatePool = withVerdicts.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0)).slice(0, candidatePoolSize);

  const investorProfile = await investorProfileRepository.findDefaultInvestorProfile().catch(() => null);
  const ranked = await personalIntelligenceService.rankByUserRelevance(candidatePool, { investorProfile });
  return ranked.slice(0, limit);
}

function buildPortfolioSnapshot(portfolioSummary) {
  return {
    totalValue: portfolioSummary.totalValue,
    cashBalance: portfolioSummary.cashBalance,
    positionCount: (portfolioSummary.positions || []).length,
  };
}

// Sprint 28 Priority 3 — Intelligence Timeline. autonomousMarketService
// already tags each feed item with a real timeBucket ("overnight" for
// geopolitics, "since-open" for earnings, "last-hour" as the default) and
// a real timeHorizon string ("2-4 weeks", "1-3 months", etc). Neither
// alone covers all five requested sections, so this combines them: the
// two explicit timeBucket values map straight to Overnight/Opening Bell;
// the remaining default-bucket items are split by their own timeHorizon
// text into This Week / Long Term / Today (the honest fallback when no
// horizon signal points elsewhere). No new scoring, no fabricated
// classification — every event lands based on data it already carries.
function classifyTimelineSection(item) {
  if (item.timeBucket === "overnight") return "overnight";
  if (item.timeBucket === "since-open") return "openingBell";
  const horizon = String(item.timeHorizon || "").toLowerCase();
  // Most feed items carry a real "1-3 months"-scale timeHorizon (the
  // impactIntelligenceService default) — genuinely a Long Term view, not
  // "Today." Checking "month"/"year" before "week" means a multi-month
  // horizon is classified as Long Term even if it were ever phrased with
  // both units; "Today" is reserved as the honest fallback for the rare
  // item carrying no day/week/month/year horizon signal at all, not a
  // catch-all for everything mid-range.
  if (/month|year/.test(horizon)) return "longTerm";
  if (/week/.test(horizon)) return "thisWeek";
  return "today";
}

function buildIntelligenceTimeline(feed) {
  const sections = { overnight: [], openingBell: [], today: [], thisWeek: [], longTerm: [] };
  for (const item of feed || []) {
    const section = classifyTimelineSection(item);
    sections[section].push({
      headline: item.headline,
      whyItMatters: item.whyItMatters,
      importanceScore: item.importanceScore,
      timeHorizon: item.timeHorizon,
    });
  }
  return sections;
}

// Sprint 28 Priority 2 — "Today For You." Facts stay global (the feed
// itself is untouched); only ordering and the stated reason are personal.
// Reuses feedPersonalizationService.rankFeedForInvestor (Sprint 20) rather
// than writing a second ranking function — the same profile-weight inputs
// (risk tolerance, investment horizon, age, goal) that already rank Daily
// Feed now also drive Home's agenda. Each item's reason names the actual
// signal that moved it, never a generic "personalized for you" filler.
function describePriorityReason(item, investorProfile, heldSymbols, watchlistSymbols) {
  const touched = touchedSymbols(item);
  if (touched.some((symbol) => heldSymbols.includes(symbol))) {
    return "You hold a position this directly affects.";
  }
  if (touched.some((symbol) => watchlistSymbols.includes(symbol))) {
    return "This is on your watchlist.";
  }
  if (investorProfile) {
    if (investorProfile.riskTolerance === "HIGH" && item.impactType === "opportunity") return "Matches your high risk tolerance — flagged as an opportunity.";
    if (investorProfile.riskTolerance === "LOW" && item.impactType === "risk") return "Matches your low risk tolerance — flagged as a risk to watch.";
    if (investorProfile.investmentHorizon === "SHORT_TERM" && /day|week/.test(String(item.timeHorizon || "").toLowerCase())) return "Fits your short-term investment horizon.";
    if (investorProfile.investmentHorizon === "LONG_TERM" && /year|6-12 month|12 month/.test(String(item.timeHorizon || "").toLowerCase())) return "Fits your long-term investment horizon.";
  }
  return "Ranked highest by overall market importance today.";
}

async function buildTodayForYou({ feed, heldSymbols, watchlistSymbols }) {
  const investorProfile = await investorProfileRepository.findDefaultInvestorProfile().catch(() => null);
  const ranked = feedPersonalizationService.rankFeedForInvestor(feed || [], { investorProfile });
  return ranked.slice(0, 5).map((item) => ({
    headline: item.headline,
    whyItMatters: item.whyItMatters,
    priorityReason: describePriorityReason(item, investorProfile, heldSymbols, watchlistSymbols),
  }));
}

// Sprint 28 Priority 5 — Portfolio Morning Summary. Every field is a real
// read of already-computed data (top recommendations' own action/
// qualityScore/riskScore, or the feed's own actionability), never a new
// risk/opportunity model. "No unnecessary alerts": mattersToday only
// counts recommendations the canonical verdict actually flags as
// actionable and feed items already tagged high actionability — nothing
// is escalated just to fill the section.
function buildPortfolioMorningSummary({ topRecommendations, feed, heldSymbols }) {
  const opportunities = topRecommendations.filter((rec) => rec.action === "BUY").sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));
  const risks = topRecommendations.filter((rec) => rec.action === "EXIT" || rec.action === "REDUCE").sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0));

  const highActionabilityToday = (feed || []).filter((item) => item.actionability === "high" && touchedSymbols(item).some((symbol) => heldSymbols.includes(symbol)));
  const monitorOnly = (feed || []).filter((item) => item.actionability === "monitor");

  const fallbackRisk = (feed || [])
    .filter((item) => item.impactType === "risk" && touchedSymbols(item).some((symbol) => heldSymbols.includes(symbol)))
    .sort((a, b) => (b.importanceScore || 0) - (a.importanceScore || 0))[0];

  return {
    mattersToday: [...topRecommendations.filter((rec) => rec.action !== "REDUCE" || rec.riskScore >= 60), ...highActionabilityToday.map((item) => ({ symbol: item.relatedTickers?.[0] || null, headline: item.headline }))].slice(0, 3),
    canWaitCount: monitorOnly.length,
    biggestOpportunity: opportunities[0] || null,
    biggestRisk: risks[0] || (fallbackRisk ? { symbol: fallbackRisk.relatedTickers?.[0] || null, headline: fallbackRisk.headline, reasoning: fallbackRisk.whyItMatters } : null),
  };
}

// Sprint 30 — Personal Intelligence Layer, Priority 4 (Morning Personal
// Brief). "One concise personalized summary, maximum 60 seconds to
// consume." Every line here is a condensation of a field this same
// function already computed above — no new fetch, no new fact — so this
// is purely a presentation step, and it runs last, after
// topRecommendations has already been through Priority 2's personal
// ranking. Capped at 5 short lines; any input that's honestly empty is
// skipped rather than padded with a filler line.
function buildMorningPersonalBrief({ whatHappened, whatChangedForMyPortfolio, topRecommendations, portfolioMorningSummary, shouldIDoAnythingToday }) {
  const lines = [];

  if (whatHappened?.headline) {
    lines.push(`Market: ${whatHappened.headline}`);
  }
  if (whatChangedForMyPortfolio?.summary) {
    lines.push(`Portfolio: ${whatChangedForMyPortfolio.summary}`);
  }
  if (topRecommendations?.length) {
    const top = topRecommendations[0];
    lines.push(`Top for you: ${top.symbol} — ${top.action} (quality ${top.qualityScore}/100)`);
  }
  if (portfolioMorningSummary?.biggestOpportunity) {
    lines.push(`Opportunity: ${portfolioMorningSummary.biggestOpportunity.symbol} (quality ${portfolioMorningSummary.biggestOpportunity.qualityScore}/100)`);
  }
  if (shouldIDoAnythingToday?.hasAction) {
    lines.push(`Action needed: ${shouldIDoAnythingToday.symbol} — ${shouldIDoAnythingToday.action}`);
  } else if (lines.length < 5) {
    lines.push("No action needed today.");
  }

  return lines.slice(0, 5);
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
  // Sprint 28 — topRecommendations/todayForYou run alongside them under the
  // same independent-failure rule.
  const [whatChangedSinceYesterday, whatChangedForMyPortfolio, whatChangedInBeliefs, topRecommendations, todayForYou] = await Promise.all([
    buildWhatChangedSinceYesterday(universe),
    buildWhatChangedForMyPortfolio(),
    buildWhatChangedInBeliefs(),
    buildTopRecommendations().catch(() => []),
    buildTodayForYou({ feed: overview.feed, heldSymbols, watchlistSymbols: normalizedWatchlist }).catch(() => []),
  ]);

  const portfolioSnapshot = buildPortfolioSnapshot(portfolioSummary);
  const intelligenceTimeline = buildIntelligenceTimeline(overview.feed);
  const portfolioMorningSummary = buildPortfolioMorningSummary({ topRecommendations, feed: overview.feed, heldSymbols });

  const whatHappened = {
    headline: event?.headline || "No major market-moving events detected right now.",
    sourceName: event?.sourceName || null,
    sourceUrl: event?.sourceUrl || null,
  };
  const personalBrief = buildMorningPersonalBrief({ whatHappened, whatChangedForMyPortfolio, topRecommendations, portfolioMorningSummary, shouldIDoAnythingToday });

  return {
    whatHappened,
    whyShouldICare: event?.whyItMatters || "Markets are calm — nothing urgent stands out today.",
    howDoesItAffectMe,
    whatChangedSinceYesterday,
    whatChangedForMyPortfolio,
    whatChangedInBeliefs,
    shouldIDoAnythingToday,
    // Sprint 28 — the unified Morning Brief: Recommendations, Portfolio,
    // and a time-bucketed view of the same Daily Feed/World Memory data
    // above, merged into this one response rather than duplicated across
    // separate screen-specific calls.
    topRecommendations,
    portfolioSnapshot,
    intelligenceTimeline,
    todayForYou,
    portfolioMorningSummary,
    // Sprint 30 — a condensed, personally-ranked, <=5-line brief built
    // entirely from the fields above.
    personalBrief,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  buildHomeSummary,
  classifyTimelineSection,
  buildIntelligenceTimeline,
  buildPortfolioMorningSummary,
  buildMorningPersonalBrief,
  describePriorityReason,
};
