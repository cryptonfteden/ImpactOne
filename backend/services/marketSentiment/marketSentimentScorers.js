// Phase AI-ENGINE-002.1 — Market Sentiment Engine foundation. The 5
// component scorers for dimensions with a real data source
// (MARKET_SENTIMENT_ENGINE.md §3/§5). Every scorer is a pure function
// over already-fetched data — never performs its own network/DB I/O,
// exactly the same contract discipline the Options Agent's detectors
// (optionsSignalDetectors.js) already established. A scorer that lacks
// sufficient real data returns `unavailable: true` with a specific,
// real reason — never a guessed midpoint value (no scorer ever
// defaults to 50).
const { MARKET_REGISTRY } = require("./marketSentimentDimensions");

const { clamp } = require("../../utils/portfolioRiskMetrics");

function unavailable(dimension, reason) {
  return { dimension, score: null, confidence: null, contributors: [], missingInputs: [], unavailable: true, reason };
}

function freshnessFromTimestamp(timestamp, now, maxAgeMs = null) {
  if (!timestamp) return { ageMs: null, asOf: null, maxAgeMs, isStale: null };
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return { ageMs: null, asOf: null, maxAgeMs, isStale: null };
  const ageMs = now.getTime() - date.getTime();
  return { ageMs, asOf: date.toISOString(), maxAgeMs, isStale: Number.isFinite(maxAgeMs) ? ageMs > maxAgeMs : null };
}

function matchesRegion(item, market) {
  const regionTags = MARKET_REGISTRY[market].regionTags;
  const affectedRegions = (item.affectedRegions || []).map((region) => String(region).toLowerCase());
  if (market === "US" && affectedRegions.length === 0) return true; // untagged feed items default to the US-scoped feed this platform already produces
  return affectedRegions.some((region) => regionTags.some((tag) => region.includes(tag)));
}

/**
 * News Sentiment — a real, disclosed proxy built from the live feed's
 * real `impactType`/`importanceScore` fields (autonomousMarketService.js).
 * NOT a true NLP polarity classifier — never presented as one.
 */
function scoreNewsSentiment({ feed = [], market, now = new Date() } = {}) {
  const matched = feed.filter((item) => matchesRegion(item, market));
  if (!matched.length) {
    return unavailable("NEWS_SENTIMENT", "No feed items are tagged to this market region right now.");
  }

  const opportunityCount = matched.filter((item) => item.impactType === "opportunity").length;
  const riskCount = matched.filter((item) => item.impactType === "risk").length;
  const neutralCount = matched.length - opportunityCount - riskCount;
  const netTiltPct = ((opportunityCount - riskCount) / matched.length) * 100;
  const tiltScore = clamp(Math.round(50 + netTiltPct / 2), 0, 100);

  const importanceValues = matched.map((item) => item.importanceScore).filter((value) => Number.isFinite(value));
  const avgImportance = importanceValues.length ? importanceValues.reduce((sum, value) => sum + value, 0) / importanceValues.length : null;
  const importanceScore = avgImportance === null ? tiltScore : clamp(Math.round(avgImportance), 0, 100);

  const score = clamp(Math.round(tiltScore * 0.6 + importanceScore * 0.4), 0, 100);
  const confidence = clamp(Math.round(Math.min(matched.length * 5, 100) * 0.7 + 30), 0, 100);

  const mostRecentTimestamp = matched.reduce((latest, item) => {
    const published = item.publishedAt ? new Date(item.publishedAt) : null;
    return published && (!latest || published > latest) ? published : latest;
  }, null);
  const freshness = freshnessFromTimestamp(mostRecentTimestamp, now, 48 * 60 * 60 * 1000);

  return {
    dimension: "NEWS_SENTIMENT",
    score,
    confidence,
    unavailable: false,
    reason: null,
    missingInputs: [],
    contributors: [
      {
        source: "autonomousMarketService.feed (impactType mix)",
        rawValue: { opportunityCount, riskCount, neutralCount, matchedCount: matched.length },
        normalizedValue: Math.round(netTiltPct * 100) / 100,
        weight: 0.6,
        confidence,
        freshness,
        contributionToScore: Math.round(tiltScore * 0.6 * 100) / 100,
      },
      {
        source: "autonomousMarketService.feed (importanceScore average)",
        rawValue: avgImportance,
        normalizedValue: importanceScore,
        weight: 0.4,
        confidence,
        freshness,
        contributionToScore: Math.round(importanceScore * 0.4 * 100) / 100,
      },
    ],
  };
}

/**
 * AI Recommendation Distribution — a real tally over
 * autonomousRecommendationRepository.listActive()'s real `action` field.
 * Scoped to US only: the recommendation engine's tracked universe is US
 * equities (portfolio/watchlist/AUTONOMOUS_SCAN_UNIVERSE), not a
 * per-market concept — never fabricated for a market it has no real
 * coverage of.
 */
function scoreAiRecommendationDistribution({ recommendations = [], market, now = new Date() } = {}) {
  if (!MARKET_REGISTRY[market].recommendationEligible) {
    return unavailable("AI_RECOMMENDATION_DISTRIBUTION", "The recommendation engine's tracked universe is US equities only — no real per-market recommendation data exists for this market.");
  }
  if (!recommendations.length) {
    return unavailable("AI_RECOMMENDATION_DISTRIBUTION", "No active recommendations exist right now.");
  }

  const buyCount = recommendations.filter((rec) => rec.action === "BUY").length;
  const reduceCount = recommendations.filter((rec) => rec.action === "REDUCE").length;
  const exitCount = recommendations.filter((rec) => rec.action === "EXIT").length;
  const total = recommendations.length;
  const netTilt = (buyCount - reduceCount - exitCount) / total;
  const score = clamp(Math.round(50 + netTilt * 50), 0, 100);
  const confidence = clamp(Math.round(Math.min(total * 8, 100)), 0, 100);

  const mostRecentTimestamp = recommendations.reduce((latest, rec) => {
    const created = rec.createdAt ? new Date(rec.createdAt) : null;
    return created && (!latest || created > latest) ? created : latest;
  }, null);
  const freshness = freshnessFromTimestamp(mostRecentTimestamp, now, 48 * 60 * 60 * 1000);

  return {
    dimension: "AI_RECOMMENDATION_DISTRIBUTION",
    score,
    confidence,
    unavailable: false,
    reason: null,
    missingInputs: [],
    contributors: [
      {
        source: "autonomousRecommendationRepository.listActive()",
        rawValue: { buyCount, reduceCount, exitCount, total },
        normalizedValue: Math.round(netTilt * 10000) / 100,
        weight: 1,
        confidence,
        freshness,
        contributionToScore: score - 50,
      },
    ],
  };
}

/**
 * Market breadth proxy — a transparent cross-index participation read,
 * not an exchange advance/decline statistic. It uses verified daily
 * closes for the registered broad-market proxies and reports the share
 * above their own 50- and 200-day averages. The contributor explicitly
 * names this limitation so the UI cannot present it as full NYSE/Nasdaq
 * constituent breadth.
 */
function scoreMarketBreadth({ analyses = [], market, now = new Date() } = {}) {
  const usable = analyses.filter((analysis) => {
    const inputs = analysis?.signals?.trend?.calculationInputs;
    return analysis?.signals?.trend?.enoughDataStatus === "SUFFICIENT"
      && Number.isFinite(inputs?.lastClose)
      && Number.isFinite(inputs?.sma50);
  });
  if (!usable.length) {
    return unavailable("MARKET_BREADTH", "No registered market proxy has sufficient verified daily price history for a participation reading.");
  }

  const above50Count = usable.filter((analysis) => analysis.signals.trend.calculationInputs.lastClose > analysis.signals.trend.calculationInputs.sma50).length;
  const withSma200 = usable.filter((analysis) => Number.isFinite(analysis.signals.trend.calculationInputs.sma200));
  const above200Count = withSma200.filter((analysis) => analysis.signals.trend.calculationInputs.lastClose > analysis.signals.trend.calculationInputs.sma200).length;
  const above50Pct = (above50Count / usable.length) * 100;
  const above200Pct = withSma200.length ? (above200Count / withSma200.length) * 100 : null;
  const score = clamp(Math.round(above200Pct === null ? above50Pct : above50Pct * 0.6 + above200Pct * 0.4), 0, 100);
  const registeredCount = MARKET_REGISTRY[market].proxySymbols.length;
  const coverage = usable.length / Math.max(registeredCount, 1);
  const confidence = clamp(Math.round(35 + coverage * 45 + Math.min(usable.length, 5) * 4), 0, 100);

  const contributors = usable.map((analysis) => {
    const inputs = analysis.signals.trend.calculationInputs;
    const above50 = inputs.lastClose > inputs.sma50;
    const above200 = Number.isFinite(inputs.sma200) ? inputs.lastClose > inputs.sma200 : null;
    return {
      source: `technicalIntelligenceService.analyzeSymbol(${analysis.symbol}) — broad-market price proxy`,
      rawValue: { symbol: analysis.symbol, lastClose: inputs.lastClose, sma50: inputs.sma50, sma200: inputs.sma200, above50, above200 },
      normalizedValue: above200 === null ? (above50 ? 100 : 0) : Math.round((above50 ? 60 : 0) + (above200 ? 40 : 0)),
      weight: Math.round((1 / usable.length) * 10000) / 10000,
      confidence,
      freshness: freshnessFromTimestamp(analysis.signals.trend.freshness?.lastBarDate, now, 4 * 24 * 60 * 60 * 1000),
      contributionToScore: null,
    };
  });

  return {
    dimension: "MARKET_BREADTH",
    score,
    confidence,
    unavailable: false,
    reason: null,
    missingInputs: ["This is a broad-market ETF/index participation proxy, not an exchange-wide advance/decline count."],
    contributors,
    proxyCoverage: { usable: usable.length, registered: registeredCount, above50Pct: Math.round(above50Pct), above200Pct: above200Pct === null ? null : Math.round(above200Pct) },
  };
}

/**
 * Fear & Greed — a real, disclosed composite of macroRegime.riskMode
 * (FRED-backed, altDataService.deriveMacroRegime) and the Polymarket
 * trend (altDataService.getPolymarketData). Deliberately does NOT reuse
 * autonomousMarketService.js's fearGreedProxy field, which is a
 * mislabeled duplicate of an unrelated confidence score, not an
 * independent fear/greed computation (MARKET_SENTIMENT_ENGINE.md §3/§5b).
 * Scoped to macro-relevant markets only (no non-US macro data source
 * exists).
 */
function scoreFearGreed({ macroData, polymarketData = [], market, now = new Date() } = {}) {
  if (!MARKET_REGISTRY[market].macroRelevant) {
    return unavailable("FEAR_GREED", "No macro data source exists for this market region — only US/Fed-based data is available.");
  }
  if (!macroData?.regime?.riskMode) {
    return unavailable("FEAR_GREED", "Macro regime data is currently unavailable.");
  }

  const riskModeScore = macroData.regime.riskMode === "risk-on" ? 65 : 35;
  const macroConfidence = macroData.source === "fred" ? 80 : 45; // honest: lower confidence when altDataService fell back to its disclosed static fallback

  const trendValues = polymarketData.map((market_) => (market_.trend === "Up" ? 1 : market_.trend === "Down" ? -1 : 0));
  const hasPolymarket = trendValues.length > 0;
  const avgTrend = hasPolymarket ? trendValues.reduce((sum, value) => sum + value, 0) / trendValues.length : 0;
  const polyScore = clamp(Math.round(50 + avgTrend * 15), 0, 100);
  const polyConfidence = hasPolymarket ? (polymarketData.some((item) => item.source === "polymarket") ? 70 : 35) : 0;

  const macroWeight = hasPolymarket ? 0.6 : 1;
  const polyWeight = hasPolymarket ? 0.4 : 0;
  const score = clamp(Math.round(riskModeScore * macroWeight + polyScore * polyWeight), 0, 100);
  const confidence = clamp(Math.round(macroConfidence * macroWeight + polyConfidence * polyWeight), 0, 100);

  const contributors = [
    {
      source: "altDataService.deriveMacroRegime() (riskMode)",
      rawValue: macroData.regime.riskMode,
      normalizedValue: riskModeScore,
      weight: macroWeight,
      confidence: macroConfidence,
      freshness: freshnessFromTimestamp(macroData.rates?.asOf === "n/a" ? null : macroData.rates?.asOf, now, 10 * 24 * 60 * 60 * 1000),
      contributionToScore: Math.round(riskModeScore * macroWeight * 100) / 100,
    },
  ];
  if (hasPolymarket) {
    contributors.push({
      source: "altDataService.getPolymarketData() (trend)",
      rawValue: polymarketData.map((item) => item.trend),
      normalizedValue: polyScore,
      weight: polyWeight,
      confidence: polyConfidence,
      freshness: { ageMs: null, asOf: now.toISOString(), maxAgeMs: null, isStale: null }, // Polymarket entries carry no per-item timestamp field
      contributionToScore: Math.round(polyScore * polyWeight * 100) / 100,
    });
  }

  return { dimension: "FEAR_GREED", score, confidence, unavailable: false, reason: null, missingInputs: [], contributors };
}

/**
 * Volatility — real, price-history-derived realized volatility
 * (technicalIntelligenceService.analyzeVolatilityRegime), aggregated
 * across a market's proxy-symbol universe. Explicitly realized-vol
 * based, never implied-vol/VIX — no such data source exists.
 */
function scoreVolatility({ analyses = [], market, now = new Date() } = {}) {
  const usable = analyses.filter((analysis) => analysis?.signals?.volatilityRegime?.enoughDataStatus === "SUFFICIENT");
  if (!usable.length) {
    return unavailable("VOLATILITY", "No symbol in this market's proxy universe has sufficient real price history yet.");
  }

  const REGIME_SCORE = { HIGH_VOLATILITY: 25, NORMAL_VOLATILITY: 55, LOW_VOLATILITY: 80 };
  const perSymbolScores = usable.map((analysis) => REGIME_SCORE[analysis.signals.volatilityRegime.signal] ?? 55);
  const score = clamp(Math.round(perSymbolScores.reduce((sum, value) => sum + value, 0) / perSymbolScores.length), 0, 100);
  const confidence = clamp(Math.round(70 * (usable.length / analyses.length || 1)), 0, 100);
  const weight = 1 / usable.length;

  const contributors = usable.map((analysis, index) => ({
    source: `technicalIntelligenceService.analyzeSymbol(${analysis.symbol})`,
    rawValue: analysis.signals.volatilityRegime.calculationInputs,
    normalizedValue: perSymbolScores[index],
    weight: Math.round(weight * 10000) / 10000,
    confidence,
    freshness: freshnessFromTimestamp(analysis.signals.volatilityRegime.freshness?.lastBarDate, now, 4 * 24 * 60 * 60 * 1000),
    contributionToScore: Math.round(perSymbolScores[index] * weight * 100) / 100,
  }));

  return { dimension: "VOLATILITY", score, confidence, unavailable: false, reason: null, missingInputs: [], contributors };
}

/**
 * Macro Events — real for the regime half (altDataService.getMacroData +
 * cftcCotProvider's live CFTC COT data); honestly discloses the missing
 * event-calendar half (Fed/ECB/FOMC/Treasury providers are stubs) in its
 * own missingInputs, every time — this is a permanent, disclosed gap,
 * not a transient failure.
 */
function scoreMacroEvents({ macroData, cotResult, market, now = new Date() } = {}) {
  if (!MARKET_REGISTRY[market].macroRelevant) {
    return unavailable("MACRO_EVENTS", "No macro data source exists for this market region — only US/Fed-based data is available.");
  }
  if (!macroData?.regime?.inflationPressure || !macroData?.regime?.recessionRisk) {
    return unavailable("MACRO_EVENTS", "Macro regime data is currently unavailable.");
  }

  const regime = macroData.regime;
  const inflationScore = regime.inflationPressure === "low" ? 70 : regime.inflationPressure === "moderate" ? 55 : 30;
  const recessionScore = regime.recessionRisk === "low" ? 70 : regime.recessionRisk === "medium" ? 50 : 25;
  const macroConfidence = macroData.source === "fred" ? 80 : 45;

  const hasCot = Boolean(cotResult && cotResult.status === "LIVE" && cotResult.errorState == null);
  const cotScore = hasCot ? clamp(Math.round(50 + (cotResult.netPositionChangePct || 0) * 2), 0, 100) : null;

  const macroWeight = hasCot ? 0.7 : 1;
  const cotWeight = hasCot ? 0.3 : 0;
  const macroBlend = Math.round((inflationScore + recessionScore) / 2);
  const score = clamp(Math.round(macroBlend * macroWeight + (cotScore ?? 0) * cotWeight), 0, 100);
  const confidence = clamp(Math.round(macroConfidence * macroWeight + (hasCot ? 65 : 0) * cotWeight), 0, 100);

  const contributors = [
    {
      source: "altDataService.getMacroData() (inflation/recession regime)",
      rawValue: { inflationPressure: regime.inflationPressure, recessionRisk: regime.recessionRisk },
      normalizedValue: macroBlend,
      weight: macroWeight,
      confidence: macroConfidence,
      freshness: freshnessFromTimestamp(macroData.cpi?.asOf === "n/a" ? null : macroData.cpi?.asOf, now, 45 * 24 * 60 * 60 * 1000),
      contributionToScore: Math.round(macroBlend * macroWeight * 100) / 100,
    },
  ];
  if (hasCot) {
    contributors.push({
      source: "cftcCotProvider / cotIntelligenceService (COT positioning)",
      rawValue: cotResult.netPositionChangePct ?? null,
      normalizedValue: cotScore,
      weight: cotWeight,
      confidence: 65,
      freshness: freshnessFromTimestamp(cotResult.asOf, now, 10 * 24 * 60 * 60 * 1000),
      contributionToScore: Math.round((cotScore ?? 0) * cotWeight * 100) / 100,
    });
  }

  return {
    dimension: "MACRO_EVENTS",
    score,
    confidence,
    unavailable: false,
    reason: null,
    // A real, permanent, disclosed sub-gap on an otherwise-available
    // dimension (architecture §5e) — distinct from the dimension being
    // entirely unavailable.
    missingInputs: ["Scheduled Fed/ECB/FOMC/Treasury macro events are not available — those providers are honest stubs (fedProvider.js/ecbProvider.js/fomcProvider.js/treasuryProvider.js)."],
    contributors,
  };
}

module.exports = {
  scoreNewsSentiment,
  scoreAiRecommendationDistribution,
  scoreMarketBreadth,
  scoreFearGreed,
  scoreVolatility,
  scoreMacroEvents,
};
