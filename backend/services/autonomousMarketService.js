const { get, set } = require("./intelligenceCache");
const { getDailyBrief } = require("./dailyBriefService");
const { analyzeIntelligence, analyzePortfolioIntelligence } = require("./impactIntelligenceService");
const { getAltDataSummary } = require("./altDataService");
const { getQuote } = require("./finnhubService");
// Namespace-style (not destructured) so tests can monkey-patch it, matching
// the testability convention already used for finnhubService elsewhere in
// this codebase (e.g. portfolioEngineService.js).
const newsService = require("./newsService");

const CORE_EVENT_TYPES = {
  macro: ["macro", "inflation", "jobs", "growth"],
  geopolitics: ["war", "conflict", "geopolit", "border", "sanction"],
  centralBanks: ["fed", "ecb", "boj", "rate", "central bank"],
  earnings: ["earnings", "guidance", "beat", "miss"],
  ma: ["acquire", "merger", "m&a", "deal"],
  regulation: ["regulation", "sec", "doj", "antitrust", "policy"],
  supplyChain: ["supply", "shipment", "factory", "logistics"],
  semiconductors: ["chip", "semiconductor", "foundry", "gpu"],
  energy: ["oil", "gas", "energy", "opec"],
  crypto: ["bitcoin", "btc", "crypto", "etf"],
  defense: ["defense", "missile", "military"],
  ai: ["ai", "nvidia", "model", "compute"],
  healthcare: ["drug", "healthcare", "fda", "biotech"],
  consumer: ["consumer", "retail", "spending", "discretionary"],
  financials: ["bank", "credit", "financial", "lending"],
  space: ["space", "launch", "satellite", "orbital"],
  nuclear: ["nuclear", "uranium", "reactor"],
  cybersecurity: ["cyber", "security", "breach", "software security"],
  // Sprint 20, Part 6 — Theme Dashboard's seventh theme.
  quantum: ["quantum", "qubit", "quantum computing"],
};

const DEFAULT_WATCHLIST = ["AAPL", "NVDA", "TSLA"];
const DEFAULT_SCENARIOS = ["Oil spike", "Fed rate hike", "BTC ETF approval", "Israel conflict"];
const AUTONOMOUS_SCAN_UNIVERSE = {
  macro: ["Fed rate hike", "Global macro scan", "Yield curve steepening", "Dollar liquidity squeeze"],
  market: ["Equity market breadth inflection", "Volatility regime shift"],
  sector: ["Sector rotation into defensives", "Sector rotation into cyclicals"],
  stock: ["AAPL earnings", "NVDA AI demand acceleration", "TSLA delivery shock"],
  etf: ["Semiconductor ETF breakout", "Energy ETF leadership"],
  crypto: ["BTC ETF approval", "Crypto liquidity expansion"],
  commodity: ["Oil spike", "Copper demand rebound", "Gold safe-haven bid"],
  bond: ["Treasury duration squeeze", "Credit spread widening"],
  currency: ["USD strength regime", "JPY policy divergence"],
  predictionMarkets: ["Prediction markets price policy easing"],
  cot: ["COT positioning inflection"],
  congress: ["Congress trading rotation"],
  insiderBuying: ["Insider buying cluster"],
  options: ["Unusual options activity in semiconductors"],
  earningsCalendar: ["Earnings calendar concentration"],
  economicCalendar: ["Economic calendar volatility window"],
  centralBankEvents: ["ECB surprise guidance"],
  geopoliticalEvents: ["Israel conflict", "South China Sea escalation"],
  supplyChainDisruptions: ["Supply chain bottleneck in semiconductor equipment"],
  shippingData: ["Shipping rates surge"],
  energy: ["Oil spike", "Natural gas storage shock"],
  defense: ["Defense procurement acceleration"],
  ai: ["AI capex supercycle"],
  semiconductors: ["Semiconductor capacity constraint"],
  space: ["Satellite launch cadence acceleration"],
  nuclear: ["Nuclear policy re-rating"],
  cybersecurity: ["Cybersecurity spending surge"],
  healthcare: ["Healthcare innovation re-rating"],
  consumer: ["Consumer discretionary slowdown"],
  financials: ["Bank funding stress"],
  // Sprint 20, Part 6 — Theme Dashboard's seventh theme.
  quantum: ["Quantum computing breakthrough"],
};
const COUNTRY_UNIVERSE = ["US", "EU", "China", "Taiwan", "Japan", "Middle East", "UK", "India"];

function unique(values) {
  return Array.from(new Set((values || []).filter(Boolean)));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeSymbols(values = []) {
  const normalized = values.map((item) => String(item || "").trim().toUpperCase()).filter(Boolean);
  return normalized.length ? unique(normalized) : DEFAULT_WATCHLIST;
}

function classifyEventType(headline = "") {
  const text = String(headline || "").toLowerCase();
  for (const [type, keywords] of Object.entries(CORE_EVENT_TYPES)) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      return type;
    }
  }
  return "macro";
}

function mapScope(type) {
  if (["macro", "geopolitics", "centralBanks", "energy", "crypto"].includes(type)) return "global";
  if (["earnings", "ma", "regulation", "ai", "semiconductors", "supplyChain", "defense", "healthcare"].includes(type)) return "cross-sector";
  return "regional";
}

function mapUrgency(score) {
  if (score >= 80) return "high";
  if (score >= 60) return "medium";
  return "low";
}

function mapReliability(confidence, sources = []) {
  const sourceCount = (sources || []).length;
  if (confidence >= 80 && sourceCount >= 4) return "high";
  if (confidence >= 60 && sourceCount >= 2) return "medium";
  return "developing";
}

function buildCounterarguments(type, event) {
  const base = [
    "Positioning may already reflect the headline, limiting follow-through.",
    "Cross-asset transmission could remain localized instead of broadening.",
  ];

  if (type === "centralBanks") {
    base.unshift("Policy communication may calm markets if the move is already priced in.");
  }
  if (type === "earnings") {
    base.unshift(`Management commentary could offset the first reaction to ${event}.`);
  }

  return base.slice(0, 3);
}

function buildInvalidation(type) {
  if (type === "energy") return ["Commodity prices retrace sharply.", "Inflation pass-through fails to broaden."];
  if (type === "crypto") return ["ETF flow momentum fades.", "Macro liquidity tightens more than expected."];
  if (type === "centralBanks") return ["Forward guidance softens the policy signal.", "Growth data reaccelerates against the initial narrative."];
  return ["Supporting data fails to confirm the first-order move.", "Sector leadership rotates away from affected assets."];
}

function buildRegions(analysis, type) {
  const countries = analysis?.affected?.countries || [];
  if (countries.length) return countries;
  if (type === "geopolitics") return ["Middle East", "US", "EU"];
  if (type === "crypto") return ["US", "Global"];
  return ["US", "Global"];
}

function buildActionability(score, urgency, hasExposure) {
  if (hasExposure && score >= 75) return "high";
  if (urgency === "medium" && score >= 60) return "medium";
  return "monitor";
}

function buildRiskLevel(type, score) {
  if (type === "geopolitics" || type === "centralBanks") return score >= 75 ? "high" : "medium";
  if (type === "earnings" || type === "ai") return score >= 70 ? "medium" : "low";
  return score >= 80 ? "high" : score >= 60 ? "medium" : "low";
}

function computeOpportunityRiskScores(event, symbol, quoteChange, altSignals) {
  const eventMatch = (event.relatedTickers || []).includes(symbol) ? 16 : 0;
  const predictionBias = Number(altSignals?.predictionMarketProbabilities?.probability || 0.5);
  const institutionalBias = String(altSignals?.smartMoneyPositioning?.signal || "").toLowerCase().includes("bull") ? 12 : 6;
  const momentum = clamp(Math.round(50 + Number(quoteChange || 0) * 6), 0, 100);
  const opportunityScore = clamp(Math.round(40 + event.importanceScore * 0.25 + Math.max(0, Number(quoteChange || 0)) * 5 + predictionBias * 20 + eventMatch), 0, 100);
  const riskScore = clamp(Math.round(35 + event.importanceScore * 0.3 + Math.max(0, -Number(quoteChange || 0)) * 6 + (event.impactType === "risk" ? 12 : 0)), 0, 100);

  return {
    opportunityScore,
    riskScore,
    momentum,
    institutionalActivity: clamp(Math.round(50 + institutionalBias + Number(altSignals?.confidenceScore || 0) * 0.2), 0, 100),
    predictionMarketSignal: clamp(Math.round(predictionBias * 100), 0, 100),
    macroExposure: clamp(Math.round(event.importanceScore * 0.7), 0, 100),
    eventExposure: clamp(Math.round(eventMatch ? event.importanceScore : event.importanceScore * 0.55), 0, 100),
  };
}

function filterMeaningful(items = [], threshold = 60) {
  return items.filter((item) => Number(item.importanceScore || item.score || 0) >= threshold);
}

function bucketByKey(items = [], keySelector) {
  return items.reduce((map, item) => {
    const key = keySelector(item);
    if (!key) {
      return map;
    }
    map[key] = (map[key] || 0) + 1;
    return map;
  }, {});
}

function average(values = []) {
  const filtered = values.filter((item) => Number.isFinite(Number(item)));
  if (!filtered.length) {
    return 0;
  }
  return filtered.reduce((sum, item) => sum + Number(item), 0) / filtered.length;
}

function deriveExpectedDuration(timeHorizon = "1-3 months") {
  if (timeHorizon.includes("1-4 weeks")) return "2-4 weeks";
  if (timeHorizon.includes("1-3 months")) return "1-3 months";
  return "3-6 months";
}

function deriveHistoricalOutcome(history = []) {
  const top = history[0] || null;
  if (!top) {
    return {
      historicalAnalogs: [],
      bestHistoricalOutcome: "No high-confidence analog yet.",
      worstHistoricalOutcome: "No high-confidence analog yet.",
    };
  }

  return {
    historicalAnalogs: history.slice(0, 3).map((item) => `${item.event} (${item.similarity}%)`),
    bestHistoricalOutcome: `${top.event}: winners included ${(top.winningSectors || []).slice(0, 2).join(", ") || "quality assets"}.`,
    worstHistoricalOutcome: `${top.event}: losers included ${(top.losingSectors || []).slice(0, 2).join(", ") || "cyclicals"}.`,
  };
}

function buildScanCoverage() {
  return Object.entries(AUTONOMOUS_SCAN_UNIVERSE).map(([scanType, events]) => ({
    scanType,
    status: "active",
    sourceCount: events.length,
    examples: events.slice(0, 2),
  }));
}

// Small curated tier of well-known financial news outlets. A heuristic,
// not a fabricated precision score — anything not on this list gets the
// same flat medium default rather than being penalized.
const HIGH_QUALITY_NEWS_SOURCES = ["reuters", "bloomberg", "wall street journal", "wsj", "cnbc", "financial times", "associated press", "marketwatch"];
const DEFAULT_SOURCE_QUALITY_SCORE = 60;
const HIGH_SOURCE_QUALITY_SCORE = 95;

function sourceQualityScore(sourceName) {
  if (!sourceName) {
    return DEFAULT_SOURCE_QUALITY_SCORE;
  }
  const normalized = String(sourceName).toLowerCase();
  return HIGH_QUALITY_NEWS_SOURCES.some((known) => normalized.includes(known)) ? HIGH_SOURCE_QUALITY_SCORE : DEFAULT_SOURCE_QUALITY_SCORE;
}

function recencyScore(publishedAt) {
  if (!publishedAt) {
    return 40;
  }
  const ageMs = Date.now() - new Date(publishedAt).getTime();
  if (!Number.isFinite(ageMs) || ageMs < 0) {
    return 40;
  }
  const ageHours = ageMs / (1000 * 60 * 60);
  if (ageHours <= 6) return 100;
  if (ageHours <= 24) return 80;
  if (ageHours <= 72) return 55;
  if (ageHours <= 168) return 30;
  return 10;
}

// Earlier query terms are higher priority (see buildNewsQueryTerms) —
// active-recommendation/held-symbol matches should outrank sector-level
// matches even before recency/source quality are factored in.
function relevanceScoreForTermIndex(termIndex) {
  return Math.max(20, 100 - termIndex * 15);
}

/**
 * Sprint 16 Phase C — ranks candidate articles (each tagged with the index
 * of the query term that surfaced it) by portfolio relevance, recency, and
 * source quality, before the top ones are selected for expensive analysis.
 * "Urgency" ranking of the final analyzed feed is unchanged — that still
 * happens via the existing importanceScore sort once analyzeIntelligence
 * has actually run.
 */
function rankNewsArticles(taggedArticles = []) {
  return taggedArticles
    .map(({ article, termIndex }) => {
      const relevance = relevanceScoreForTermIndex(termIndex);
      const recency = recencyScore(article?.publishedAt);
      const quality = sourceQualityScore(article?.source?.name);
      const score = relevance * 0.45 + recency * 0.3 + quality * 0.25;
      return { article, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((item) => item.article);
}

/**
 * Real news headlines (when NEWS_API_KEY is configured — newsService
 * already falls back gracefully otherwise) are preferred first, backfilled
 * with the existing synthetic scenario catalog up to the same 28-item cap
 * this function has always returned. Real articles carry a citable
 * sourceUrl; synthetic entries carry null (unchanged behavior).
 */
function getRepresentativeEvents({ scenarios = [], dailyBrief = null, watchlist = [], liveNews = [] }) {
  const liveNewsEvents = (liveNews || [])
    .map((article) => ({ headline: String(article?.title || "").trim(), sourceUrl: article?.url || null, sourceName: article?.source?.name || null, publishedAt: article?.publishedAt || null }))
    .filter((item) => item.headline)
    .slice(0, 6);
  const liveHeadlines = new Set(liveNewsEvents.map((item) => item.headline));

  const syntheticHeadlines = unique([
    ...scenarios,
    ...(dailyBrief?.topMarketMovingEvents || []).map((item) => item.event),
    ...(dailyBrief?.altSignalsSnapshot?.upcomingEventRisk || []).map((item) => item.event),
    ...watchlist.map((symbol) => `${symbol} watchlist momentum`),
    ...Object.values(AUTONOMOUS_SCAN_UNIVERSE).flatMap((items) => items.slice(0, 1)),
  ]).filter((headline) => !liveHeadlines.has(headline));

  const syntheticEvents = syntheticHeadlines.map((headline) => ({ headline, sourceUrl: null, sourceName: null, publishedAt: null }));

  return [...liveNewsEvents, ...syntheticEvents].slice(0, 28);
}

function choosePortfolioAction(score) {
  if (score >= 86) return "Buy";
  if (score >= 72) return "Accumulate";
  if (score >= 55) return "Wait";
  if (score >= 38) return "Reduce";
  return "Exit";
}

function buildPositionSize(score) {
  if (score >= 86) return "4-6%";
  if (score >= 72) return "2-4%";
  if (score >= 55) return "1-2% starter";
  if (score >= 38) return "Trim to <1%";
  return "0% / avoid";
}

function buildStopLevel(score) {
  if (score >= 86) return "-7% tactical stop";
  if (score >= 72) return "-8% tactical stop";
  if (score >= 55) return "Wait for confirmation";
  if (score >= 38) return "Tighten risk aggressively";
  return "Exit on strength / no new risk";
}

function buildExpectedUpside(score) {
  if (score >= 86) return "15-22%";
  if (score >= 72) return "10-16%";
  if (score >= 55) return "4-9%";
  if (score >= 38) return "0-3%";
  return "Negative skew";
}

function buildRiskReward(score) {
  if (score >= 86) return "2.8:1";
  if (score >= 72) return "2.1:1";
  if (score >= 55) return "1.3:1";
  if (score >= 38) return "0.8:1";
  return "0.4:1";
}

function buildPortfolioAction(idea) {
  const conviction = Number(idea.convictionScore || 0);
  return {
    action: choosePortfolioAction(conviction),
    positionSize: buildPositionSize(conviction),
    stopLevel: buildStopLevel(conviction),
    timeHorizon: idea.timeHorizon || "1-3 months",
    expectedUpside: buildExpectedUpside(conviction),
    riskRewardRatio: buildRiskReward(conviction),
  };
}

function buildCountryMetrics({ country, feed, macroRegime }) {
  const related = feed.filter((item) => (item.affectedRegions || []).includes(country));
  const avgScore = Math.round(average(related.map((item) => item.importanceScore)) || 48);
  const avgRisk = Math.round(average(related.map((item) => item.riskLevel === "high" ? 80 : item.riskLevel === "medium" ? 60 : 35)) || 40);
  const military = related.some((item) => item.eventType === "geopolitics" || item.eventType === "defense") ? "elevated" : "contained";
  const inflationTrend = macroRegime?.inflationPressure || "moderate";
  const economicMomentum = macroRegime?.riskMode === "risk-on" ? "improving" : "slowing";
  const marketSentiment = avgScore >= 70 ? "bullish" : avgScore <= 45 ? "defensive" : "balanced";
  const attractiveness = clamp(Math.round(100 - avgRisk + (economicMomentum === "improving" ? 10 : -4)), 0, 100);

  return {
    country,
    marketSentiment,
    politicalRisk: avgRisk >= 75 ? "high" : avgRisk >= 55 ? "medium" : "low",
    economicMomentum,
    inflationTrend,
    currencyTrend: country === "US" ? "firm" : country === "Japan" ? "policy-sensitive" : country === "EU" ? "range-bound" : "mixed",
    tradeActivity: related.some((item) => item.eventType === "supplyChain" || item.eventType === "shippingData") ? "stressed" : "stable",
    militaryEscalation: military,
    investmentAttractiveness: attractiveness,
  };
}

/**
 * Shared conviction-score formula — extracted so callers besides
 * buildAlphaDiscovery's top-10 slice (e.g. the autonomous recommendation
 * engine) can score any watchlistRankings entry consistently with what
 * the rest of the app already shows.
 */
function computeConvictionScore(rankingItem) {
  return clamp(Math.round(rankingItem.overallAiScore + (rankingItem.opportunityScore - rankingItem.riskScore) * 0.2), 0, 100);
}

function buildAlphaDiscovery({ feed, watchlistRankings, globalMap, dailyBrief, altSnapshot }) {
  const ideas = watchlistRankings.map((item) => {
    const convictionScore = computeConvictionScore(item);
    return {
      symbol: item.symbol,
      convictionScore,
      thesis: item.explanation,
      primaryDriver: item.primaryDriver,
      affectedSectors: feed.find((entry) => entry.headline === item.primaryDriver)?.affectedSectors || [],
      historicalAnalogs: feed.find((entry) => entry.headline === item.primaryDriver)?.historicalAnalogs || [],
      timeHorizon: convictionScore >= 70 ? "1-3 months" : "2-6 weeks",
    };
  });

  const feedOpportunities = feed
    .filter((item) => item.impactType === "opportunity")
    .map((item) => ({
      symbol: item.relatedTickers?.[0] || item.affectedAssets?.[0] || item.headline,
      convictionScore: clamp(Math.round((item.importanceScore + item.confidence) / 2), 0, 100),
      thesis: item.whyItMatters,
      primaryDriver: item.headline,
      affectedSectors: item.affectedSectors || [],
      historicalAnalogs: item.historicalAnalogs || [],
      timeHorizon: item.expectedDuration || item.timeHorizon,
    }));

  const top10InvestmentIdeas = unique([...ideas, ...feedOpportunities].map((item) => JSON.stringify(item)))
    .map((item) => JSON.parse(item))
    .sort((a, b) => b.convictionScore - a.convictionScore)
    .slice(0, 10)
    .map((item) => ({ ...item, portfolioAction: buildPortfolioAction(item) }));

  const top10Risks = feed
    .filter((item) => item.riskLevel === "high" || item.impactType === "risk")
    .sort((a, b) => b.importanceScore - a.importanceScore)
    .slice(0, 10);

  const topMacroThemes = Object.entries(bucketByKey(feed.filter((item) => ["macro", "centralBanks", "currency", "bond", "energy"].includes(item.eventType)), (item) => item.eventType))
    .sort((a, b) => b[1] - a[1])
    .map(([theme, count]) => ({ theme, count }))
    .slice(0, 6);

  const topSectors = Object.entries(bucketByKey(feed.flatMap((item) => item.affectedSectors || []).map((sector) => ({ sector })), (item) => item.sector))
    .sort((a, b) => b[1] - a[1])
    .map(([sector, count]) => ({ sector, count }))
    .slice(0, 8);

  const capitalRotation = globalMap.capitalFlows || [];
  const institutionalPositioning = {
    smartMoney: altSnapshot?.smartMoneyPositioning || dailyBrief?.altSignalsSnapshot?.smartMoneyPositioning || null,
    predictionMarkets: altSnapshot?.predictionMarketProbabilities || dailyBrief?.altSignalsSnapshot?.predictionMarketProbabilities || null,
  };
  const hiddenOpportunities = feed
    .filter((item) => item.impactType === "opportunity" && item.actionability === "monitor")
    .slice(0, 6);
  const emergingNarratives = unique(feed.map((item) => `${item.eventType}: ${item.headline}`)).slice(0, 8);
  const contrarianOpportunities = watchlistRankings
    .filter((item) => item.riskScore > 55 && item.opportunityScore >= 55)
    .slice(0, 5)
    .map((item) => ({
      symbol: item.symbol,
      thesis: item.explanation,
      convictionScore: item.overallAiScore,
      portfolioAction: buildPortfolioAction({ convictionScore: item.overallAiScore, timeHorizon: "2-8 weeks" }),
    }));

  return {
    top10InvestmentIdeas,
    top10Risks,
    topMacroThemes,
    topSectors,
    capitalRotation,
    institutionalPositioning,
    hiddenOpportunities,
    emergingNarratives,
    contrarianOpportunities,
  };
}

function buildChangeWindows(feed, watchlistRankings) {
  const meaningfulFeed = filterMeaningful(feed, 65);
  const rankingShift = watchlistRankings
    .filter((item) => Number(item.overallAiScore || 0) >= 65)
    .slice(0, 3)
    .map((item) => `${item.symbol} remains elevated with AI score ${item.overallAiScore}/100.`);

  return {
    last15Minutes: meaningfulFeed.slice(0, 2).map((item) => `${item.headline} | ${item.whyItMatters}`),
    lastHour: meaningfulFeed.slice(0, 3).map((item) => `${item.headline} | ${item.actionability} actionability`),
    sinceMarketOpen: meaningfulFeed.slice(0, 4).map((item) => `${item.headline} | ${item.riskLevel} risk`),
    overnight: meaningfulFeed.filter((item) => item.timeBucket === "overnight").slice(0, 3).map((item) => `${item.headline} | ${item.marketScope}`),
    weekly: unique([...meaningfulFeed.slice(0, 4).map((item) => item.headline), ...rankingShift]).slice(0, 5),
  };
}

async function buildWatchlistRanks({ watchlist, feed, altSignalsBySymbol, quotesBySymbol }) {
  return watchlist.map((symbol) => {
    const livePayload = quotesBySymbol[symbol]?.quote || null;
    const quoteChange = Number(livePayload?.change || 0);
    const symbolEvents = feed.filter((item) => (item.affectedAssets || []).includes(symbol) || (item.relatedTickers || []).includes(symbol));
    const primaryEvent = symbolEvents.sort((a, b) => b.importanceScore - a.importanceScore)[0] || null;
    const altSignals = altSignalsBySymbol[symbol]?.signals || null;
    const scores = computeOpportunityRiskScores(primaryEvent || { importanceScore: 50, impactType: "neutral", relatedTickers: [] }, symbol, quoteChange, altSignals);
    const overallAiScore = clamp(Math.round((scores.opportunityScore * 0.35) + (100 - scores.riskScore) * 0.2 + scores.momentum * 0.15 + scores.institutionalActivity * 0.1 + scores.predictionMarketSignal * 0.1 + scores.macroExposure * 0.1), 0, 100);

    return {
      symbol,
      opportunityScore: scores.opportunityScore,
      riskScore: scores.riskScore,
      momentum: scores.momentum,
      institutionalActivity: scores.institutionalActivity,
      predictionMarketSignal: scores.predictionMarketSignal,
      macroExposure: scores.macroExposure,
      eventExposure: scores.eventExposure,
      overallAiScore,
      primaryDriver: primaryEvent?.headline || "No dominant event",
      // Sprint 25 — when no matched event exists, the fallback must still
      // be genuinely derived from this symbol's own real, already-computed
      // scores (never the same boilerplate sentence for every symbol with
      // no news). Honest about the absence of a driving event, specific
      // about what the score is actually built from.
      explanation:
        primaryEvent?.whyItMatters ||
        `${symbol}: no single dominant news event — score of ${overallAiScore}/100 reflects momentum ${scores.momentum}/100, opportunity ${scores.opportunityScore}/100, risk ${scores.riskScore}/100.`,
      // Live Finnhub quote data already fetched above for scoring — surfaced
      // here (rather than discarded) so downstream consumers (e.g. the
      // autonomous recommendation engine) can cite a real price, not just
      // derived scores. null when no quote was available, same graceful
      // pattern as the rest of this pipeline.
      currentPrice: Number.isFinite(livePayload?.price) ? livePayload.price : null,
      dayChangePercent: Number.isFinite(livePayload?.changePercent) ? livePayload.changePercent : null,
    };
  }).sort((a, b) => b.overallAiScore - a.overallAiScore);
}

function buildAlerts(feed, watchlistRankings) {
  const exposures = new Set(watchlistRankings.map((item) => item.symbol));
  return feed.filter((item) => {
    const highConfidence = Number(item.confidence || 0) >= 70;
    const highImpact = Number(item.importanceScore || 0) >= 72;
    const hasExposure = (item.affectedAssets || []).some((asset) => exposures.has(asset)) || (item.relatedTickers || []).some((asset) => exposures.has(asset));
    return highConfidence && highImpact && hasExposure;
  }).slice(0, 8);
}

function buildDecisionCenter({ feed, watchlistRankings, dailyBrief, globalMap }) {
  const highestConvictionIdeas = watchlistRankings.filter((item) => item.opportunityScore >= item.riskScore).slice(0, 3);
  const biggestRisks = feed.filter((item) => item.impactType === "risk" || item.riskLevel === "high").slice(0, 3);
  const mostImportantMacroEvent = feed.find((item) => ["macro", "centralBanks", "energy", "geopolitics"].includes(item.eventType)) || null;
  const mostImportantCompanyEvent = feed.find((item) => item.eventType === "earnings" || item.eventType === "ai") || null;

  return {
    highestConvictionIdeas,
    biggestRisks,
    mostImportantMacroEvent,
    mostImportantCompanyEvent,
    sectorRotation: dailyBrief?.topOpportunities || [],
    capitalFlow: globalMap.capitalFlows,
    mostImportantNewsIgnoredByMarkets: feed.find((item) => item.importanceScore >= 70 && item.actionability === "monitor") || null,
  };
}

function buildGlobalMap({ feed, dailyBrief, altSnapshot }) {
  const majorGlobalEvents = feed.slice(0, 6).map((item) => ({
    headline: item.headline,
    countries: item.affectedRegions,
    sectors: item.affectedSectors,
    score: item.importanceScore,
  }));

  return {
    majorGlobalEvents,
    countriesAffected: unique(feed.flatMap((item) => item.affectedRegions)).slice(0, 12),
    countries: COUNTRY_UNIVERSE.map((country) => buildCountryMetrics({ country, feed, macroRegime: altSnapshot?.macroRegime || dailyBrief?.altSignalsSnapshot?.macroRegime || null })),
    sectorPropagation: feed.slice(0, 4).map((item) => ({
      headline: item.headline,
      sectors: item.affectedSectors,
      assets: item.affectedAssets,
    })),
    capitalFlows: feed.slice(0, 4).map((item) => ({
      from: item.affectedSectors[0] || "Macro",
      to: item.affectedAssets[0] || "Risk assets",
      rationale: item.whyItMatters,
    })),
    macroRegime: altSnapshot?.macroRegime || dailyBrief?.altSignalsSnapshot?.macroRegime || null,
    currentMarketSentiment: {
      classification: altSnapshot?.predictionMarketProbabilities?.trend || "Stable",
      confidence: Number(dailyBrief?.aiSummary?.confidenceScore || 0),
      fearGreedProxy: Number(dailyBrief?.aiSummary?.confidenceScore || 50),
    },
  };
}

async function processEvent({ event, sourceUrl = null, sourceName = null, publishedAt = null, watchlist, portfolioExposure, anchorSymbol }) {
  const analysis = await analyzeIntelligence({ event, symbol: anchorSymbol });
  const eventType = classifyEventType(event);
  const importanceScore = clamp(Math.round((Number(analysis.confidenceScore || 60) * 0.7) + ((analysis.affected?.stocks || []).filter((item) => watchlist.includes(item)).length * 8)), 0, 100);
  const confidence = clamp(Math.round((Number(analysis.explainability?.confidence || 0) + Number(analysis.confidenceScore || 0)) / 2), 0, 100);
  const urgency = mapUrgency(importanceScore);
  const reliability = mapReliability(confidence, analysis.explainability?.dataSourcesUsed || []);
  const affectedAssets = unique([
    ...(analysis.affected?.stocks || []),
    ...(analysis.affected?.crypto || []),
    ...(analysis.affected?.commodities || []),
  ]).slice(0, 12);
  const relatedTickers = affectedAssets.filter((asset) => watchlist.includes(asset)).length
    ? affectedAssets.filter((asset) => watchlist.includes(asset))
    : (analysis.affected?.stocks || []).slice(0, 4);
  const hasPortfolioExposure = relatedTickers.length > 0 || (portfolioExposure?.portfolioExposure || []).some((holding) => affectedAssets.includes(holding.symbol));
  const impactType = importanceScore >= 75 ? "opportunity" : importanceScore <= 48 ? "risk" : (eventType === "geopolitics" || eventType === "centralBanks" ? "risk" : "neutral");
  const actionability = buildActionability(importanceScore, urgency, hasPortfolioExposure);
  const riskLevel = buildRiskLevel(eventType, importanceScore);
  const topHistory = analysis.historicalSimilarity?.[0] || null;
  const evidence = analysis.explainability?.supportingEvidence || [];
  const dataSources = analysis.explainability?.dataSourcesUsed || [];
  const historical = deriveHistoricalOutcome(analysis.historicalSimilarity || []);

  return {
    id: `${eventType}:${String(event).toLowerCase().replace(/\s+/g, "-")}`,
    headline: event,
    sourceUrl,
    sourceName,
    publishedAt,
    eventType,
    importanceScore,
    confidence,
    urgency,
    probability: clamp(Math.round((confidence + importanceScore) / 2), 0, 100),
    marketScope: mapScope(eventType),
    affectedRegions: buildRegions(analysis, eventType),
    affectedSectors: analysis.affected?.sectors || [],
    affectedAssets,
    relatedTickers,
    timeHorizon: analysis.timeHorizon || "1-3 months",
    expectedDuration: deriveExpectedDuration(analysis.timeHorizon || "1-3 months"),
    reliability,
    whyItMatters: analysis.explainability?.why || `${event} matters through cross-asset repricing and sector propagation.`,
    supportingData: evidence,
    historicalAnalogue: topHistory ? `${topHistory.event} (${topHistory.similarity}%)` : "Unavailable",
    historicalAnalogs: historical.historicalAnalogs,
    bestHistoricalOutcome: historical.bestHistoricalOutcome,
    worstHistoricalOutcome: historical.worstHistoricalOutcome,
    marketImpactPrediction: analysis.scenario?.expectedMarketReaction || "Mixed market impact expected.",
    portfolioImpactPrediction: hasPortfolioExposure ? `Portfolio overlap detected in ${relatedTickers.join(", ") || "watchlist assets"}.` : "No direct portfolio overlap detected.",
    actionability,
    riskLevel,
    timeBucket: eventType === "earnings" ? "since-open" : eventType === "geopolitics" ? "overnight" : "last-hour",
    impactType,
    explainability: {
      evidence,
      reasoning: analysis.explainability?.why || "Reasoning unavailable.",
      dataSources,
      confidence,
      counterarguments: buildCounterarguments(eventType, event),
      invalidationSignals: buildInvalidation(eventType),
    },
  };
}

/**
 * Sprint 16 Phase C — turns real portfolio/watchlist/sector/recommendation
 * state into a deduped, priority-ordered list of news query terms.
 * Priority: symbols with an existing active recommendation (freshest
 * info needed) > held portfolio symbols > watchlist symbols > portfolio
 * sector names. Capped so a single overview call issues a bounded number
 * of NewsAPI requests.
 */
function buildNewsQueryTerms({ heldSymbols = [], watchlistSymbols = [], sectors = [], activeRecommendationSymbols = [] } = {}, maxTerms = 6) {
  const terms = unique([
    ...activeRecommendationSymbols,
    ...heldSymbols,
    ...watchlistSymbols,
    ...sectors.map((sector) => `${sector} sector stocks`),
  ]);

  return terms.slice(0, maxTerms);
}

/**
 * Without portfolioContext (every caller before Phase C, and every
 * non-recommendation caller today — e.g. autonomousMarketController.js),
 * behavior is byte-identical to before: a single "markets" query. With
 * portfolioContext, issues one query per dynamic term and merges the
 * results, deduped by article URL (falling back to title when a fallback
 * article has no URL).
 */
async function fetchPersonalizedNews(portfolioContext) {
  const terms = portfolioContext ? buildNewsQueryTerms(portfolioContext) : [];
  if (!terms.length) {
    return newsService.getNews("markets").catch(() => []);
  }

  const resultsByTerm = await Promise.all(terms.map((term) => newsService.getNews(term).catch(() => [])));
  const tagged = resultsByTerm.flatMap((articles, termIndex) => (articles || []).map((article) => ({ article, termIndex })));
  const ranked = rankNewsArticles(tagged);

  // Dedupe after ranking so the highest-scored occurrence of a duplicate
  // (e.g. the same article returned by both a held-symbol and a sector
  // query) is the one that survives.
  const seen = new Set();
  const deduped = [];

  for (const article of ranked) {
    const dedupeKey = article?.url || article?.title;
    if (!dedupeKey || seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);
    deduped.push(article);
  }

  return deduped;
}

async function getAutonomousOverview({ watchlist = DEFAULT_WATCHLIST, scenarios = DEFAULT_SCENARIOS, sessionType = "morning", portfolioContext = null } = {}) {
  const normalizedWatchlist = normalizeSymbols(watchlist);
  const normalizedScenarios = scenarios.length ? scenarios : DEFAULT_SCENARIOS;
  const cacheKey = JSON.stringify({ watchlist: normalizedWatchlist, scenarios: normalizedScenarios, sessionType, portfolioContext });
  const cached = get("intel:autonomousOverview", cacheKey);
  if (cached) {
    return cached;
  }

  const portfolioInput = normalizedWatchlist.map((symbol) => ({ symbol, weight: 1 / normalizedWatchlist.length }));
  const portfolioExposure = analyzePortfolioIntelligence({ holdings: portfolioInput });

  const [dailyBrief, anchorAlt, quotesBySymbol, altSignalsBySymbol, liveNews] = await Promise.all([
    getDailyBrief({ watchlist: normalizedWatchlist, scenarios: normalizedScenarios, sessionType }),
    getAltDataSummary({ symbol: normalizedWatchlist[0] }).catch(() => null),
    Promise.all(normalizedWatchlist.map(async (symbol) => ({ symbol, payload: await getQuote(symbol).catch(() => null) }))),
    Promise.all(normalizedWatchlist.map(async (symbol) => ({ symbol, payload: await getAltDataSummary({ symbol }).catch(() => null) }))),
    fetchPersonalizedNews(portfolioContext),
  ]);

  const quotesMap = Object.fromEntries(quotesBySymbol.map(({ symbol, payload }) => [symbol, payload]));
  const altMap = Object.fromEntries(altSignalsBySymbol.map(({ symbol, payload }) => [symbol, payload]));

  const detectedEvents = getRepresentativeEvents({
    scenarios: normalizedScenarios,
    dailyBrief,
    watchlist: normalizedWatchlist,
    liveNews,
  });

  const processedFeed = await Promise.all(detectedEvents.map((event) => processEvent({
    event: event.headline,
    sourceUrl: event.sourceUrl,
    sourceName: event.sourceName,
    publishedAt: event.publishedAt,
    watchlist: normalizedWatchlist,
    portfolioExposure,
    anchorSymbol: normalizedWatchlist[0],
  })));

  const feed = processedFeed.sort((a, b) => b.importanceScore - a.importanceScore);
  const watchlistRankings = await buildWatchlistRanks({
    watchlist: normalizedWatchlist,
    feed,
    altSignalsBySymbol: altMap,
    quotesBySymbol: quotesMap,
  });
  const changeWindows = buildChangeWindows(feed, watchlistRankings);
  const alerts = buildAlerts(feed, watchlistRankings);
  const globalMap = buildGlobalMap({ feed, dailyBrief, altSnapshot: anchorAlt?.signals || null });
  const decisionCenter = buildDecisionCenter({ feed, watchlistRankings, dailyBrief, globalMap });
  const alphaDiscovery = buildAlphaDiscovery({
    feed,
    watchlistRankings,
    globalMap,
    dailyBrief,
    altSnapshot: anchorAlt?.signals || null,
  });

  const result = {
    generatedAt: new Date().toISOString(),
    watchlist: normalizedWatchlist,
    scanCoverage: buildScanCoverage(),
    pipeline: {
      stages: [
        "Event Detection",
        "Event Classification",
        "Importance Scoring",
        "Market Impact Prediction",
        "Portfolio Impact Prediction",
        "Historical Comparison",
        "AI Explanation",
        "Dashboard Delivery",
      ],
      processedEvents: feed.length,
    },
    feed,
    changeWindows,
    alerts,
    watchlistRankings,
    globalMap,
    decisionCenter,
    alphaDiscovery,
    dailyBrief,
    portfolioExposure,
    homepageAnswers: {
      whatMattersToday: feed[0]?.headline || "No dominant event detected.",
      whereMoneyIsFlowing: globalMap.capitalFlows?.[0]?.rationale || "Cross-asset flows are balanced.",
      whatChanged: changeWindows.lastHour?.[0] || "No major change window event detected.",
      whatShouldIBuy: alphaDiscovery.top10InvestmentIdeas?.[0] || null,
      whatShouldIAvoid: alphaDiscovery.top10Risks?.[0] || null,
      biggestGlobalRisk: decisionCenter.mostImportantMacroEvent || null,
    },
  };

  set("intel:autonomousOverview", cacheKey, result, 5 * 60 * 1000);
  return result;
}

module.exports = {
  getAutonomousOverview,
  buildPortfolioAction,
  computeConvictionScore,
  getRepresentativeEvents,
  buildNewsQueryTerms,
  rankNewsArticles,
  sourceQualityScore,
  recencyScore,
  buildInvalidation,
  buildCounterarguments,
  classifyEventType,
  DEFAULT_WATCHLIST,
};
