const { get, set } = require("./intelligenceCache");
const { getDailyBrief } = require("./dailyBriefService");
const { analyzeIntelligence, analyzePortfolioIntelligence } = require("./impactIntelligenceService");
const { getAltDataSummary } = require("./altDataService");
const { getQuote } = require("./finnhubService");

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
};

const DEFAULT_WATCHLIST = ["AAPL", "NVDA", "TSLA"];
const DEFAULT_SCENARIOS = ["Oil spike", "Fed rate hike", "BTC ETF approval", "Israel conflict"];

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
    const quoteChange = Number(quotesBySymbol[symbol]?.quote?.change || 0);
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
      explanation: primaryEvent?.whyItMatters || `${symbol} is being scored on macro, event, and positioning exposure.`,
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

async function processEvent({ event, watchlist, portfolioExposure, anchorSymbol }) {
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

  return {
    id: `${eventType}:${String(event).toLowerCase().replace(/\s+/g, "-")}`,
    headline: event,
    eventType,
    importanceScore,
    confidence,
    urgency,
    marketScope: mapScope(eventType),
    affectedRegions: buildRegions(analysis, eventType),
    affectedSectors: analysis.affected?.sectors || [],
    affectedAssets,
    relatedTickers,
    timeHorizon: analysis.timeHorizon || "1-3 months",
    reliability,
    whyItMatters: analysis.explainability?.why || `${event} matters through cross-asset repricing and sector propagation.`,
    supportingData: evidence,
    historicalAnalogue: topHistory ? `${topHistory.event} (${topHistory.similarity}%)` : "Unavailable",
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

async function getAutonomousOverview({ watchlist = DEFAULT_WATCHLIST, scenarios = DEFAULT_SCENARIOS, sessionType = "morning" } = {}) {
  const normalizedWatchlist = normalizeSymbols(watchlist);
  const normalizedScenarios = scenarios.length ? scenarios : DEFAULT_SCENARIOS;
  const cacheKey = JSON.stringify({ watchlist: normalizedWatchlist, scenarios: normalizedScenarios, sessionType });
  const cached = get("intel:autonomousOverview", cacheKey);
  if (cached) {
    return cached;
  }

  const portfolioInput = normalizedWatchlist.map((symbol) => ({ symbol, weight: 1 / normalizedWatchlist.length }));
  const portfolioExposure = analyzePortfolioIntelligence({ holdings: portfolioInput });

  const [dailyBrief, anchorAlt, quotesBySymbol, altSignalsBySymbol] = await Promise.all([
    getDailyBrief({ watchlist: normalizedWatchlist, scenarios: normalizedScenarios, sessionType }),
    getAltDataSummary({ symbol: normalizedWatchlist[0] }).catch(() => null),
    Promise.all(normalizedWatchlist.map(async (symbol) => ({ symbol, payload: await getQuote(symbol).catch(() => null) }))),
    Promise.all(normalizedWatchlist.map(async (symbol) => ({ symbol, payload: await getAltDataSummary({ symbol }).catch(() => null) }))),
  ]);

  const quotesMap = Object.fromEntries(quotesBySymbol.map(({ symbol, payload }) => [symbol, payload]));
  const altMap = Object.fromEntries(altSignalsBySymbol.map(({ symbol, payload }) => [symbol, payload]));

  const detectedEvents = unique([
    ...normalizedScenarios,
    ...(dailyBrief.topMarketMovingEvents || []).map((item) => item.event),
    ...(dailyBrief.altSignalsSnapshot?.upcomingEventRisk || []).map((item) => item.event),
    ...normalizedWatchlist.map((symbol) => `${symbol} watchlist momentum`),
  ]).slice(0, 10);

  const processedFeed = await Promise.all(detectedEvents.map((event) => processEvent({
    event,
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

  const result = {
    generatedAt: new Date().toISOString(),
    watchlist: normalizedWatchlist,
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
    dailyBrief,
    portfolioExposure,
  };

  set("intel:autonomousOverview", cacheKey, result, 5 * 60 * 1000);
  return result;
}

module.exports = { getAutonomousOverview };
