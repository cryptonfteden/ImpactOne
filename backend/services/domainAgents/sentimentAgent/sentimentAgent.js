// Phase SENTIMENT-AGENT-001 — "Build the Sentiment Intelligence
// Agent." This module is the reusable analysis engine, composing every
// piece this mission requires (Sentiment State, Sentiment Trend,
// Sentiment Score, Sentiment Velocity, Source Quality, Abnormal
// Activity, Bullish Factors, Bearish Factors, Risks, Confidence, AI
// Summary) from real, per-symbol news data — never fabricating social
// data, honestly reporting unavailable fields where no real source
// exists.
// backend/services/agentOrchestrator/agents/sentimentAgent.js already
// exists and is real, but it is a MARKET-WIDE reading (ignores its
// symbol argument, wraps marketSentimentService.js). This is a
// deliberately distinct, new, per-symbol capability — registered under
// a different id (`symbol-sentiment`) rather than replacing the
// existing market-wide agent, since the two answer genuinely different
// questions and neither should silently absorb the other.
const { createSentimentDataProvider } = require("./sentimentDataProvider");
const { buildDailySeries } = require("./sentimentTimeSeriesBuilder");
const { computeSentimentScore, computeSentimentState, analyzeTrendAndVelocity } = require("./sentimentTrendAnalyzer");
const { analyzeArticleRatio } = require("./articleRatioAnalyzer");
const { analyzeSourceQuality } = require("./sourceQualityAnalyzer");
const { detectAbnormalActivity } = require("./abnormalActivityDetector");
const { analyzeSentimentPriceDivergence } = require("./sentimentPriceDivergenceAnalyzer");
const { buildBullishFactors, buildBearishFactors, buildRisks } = require("./bullishBearishFactorsBuilder");
const { computeConfidence } = require("./confidenceModel");
const { generateAiSummary } = require("./aiSummary");

const defaultProvider = createSentimentDataProvider();

function assessDataQuality(metrics, sourceQuality = emptySourceQuality(), confidence = 0) {
  const articleCount = metrics?.articles?.length || 0;
  const blockers = [
    ...(articleCount < 3 ? [`Only ${articleCount} symbol-linked article(s) were verified.`] : []),
    ...(sourceQuality.distinctSourceCount < 2 ? [`Only ${sourceQuality.distinctSourceCount} distinct news source(s) were verified.`] : []),
    ...(confidence < 40 ? [`Sentiment confidence is ${Math.round(confidence)}/100.`] : []),
  ];
  return {
    source: metrics?.sourceProvider || "verified symbol news",
    queryIdentity: metrics?.queryIdentity || null,
    articleCount,
    distinctSourceCount: sourceQuality.distinctSourceCount,
    tier1ArticleCount: sourceQuality.tier1ArticleCount,
    socialDataAvailable: Boolean(metrics?.socialAvailable),
    priceBarsAvailable: metrics?.priceBars?.length || 0,
    blockers,
    signalEligible: Boolean(metrics?.dataAvailable) && blockers.length === 0,
  };
}

function emptySourceQuality() {
  return { distinctSourceCount: 0, sources: [], tier1ArticleCount: 0, totalArticleCount: 0, credibilityScore: 0 };
}

function buildUnavailableReport(symbol, asOf, reason, inputs) {
  const dataQuality = assessDataQuality(inputs);
  const report = {
    symbol,
    generatedAt: asOf,
    dataAvailable: false,
    signalEligible: false,
    dataQuality,
    unavailableReason: reason,
    sentimentState: "NEUTRAL",
    sentimentTrend: "STABLE",
    sentimentScore: 50,
    sentimentVelocity: { value: null, unit: "score points per day", insufficientData: true },
    sourceQuality: emptySourceQuality(),
    abnormalActivity: { volumeSpikes: [], sentimentShifts: [], hasAbnormalActivity: false },
    articleRatio: { positiveCount: 0, negativeCount: 0, neutralCount: 0, ratio: null },
    divergence: { divergence: "NONE", priceDirection: null, priceChangePercent: null },
    bullishFactors: [],
    bearishFactors: [],
    risks: [],
    confidence: { confidence: 0, components: { base: 0, sampleSizeBonus: 0, diversityBonus: 0, credibilityBonus: 0, socialPenalty: 0, abnormalPenalty: 0 } },
    inputs,
  };
  report.aiSummary = generateAiSummary(report);
  return report;
}

/**
 * Generates the full normalized Sentiment Intelligence report for one
 * symbol. `provider` defaults to the real, already-tested
 * NewsAPI/priceHistoryProvider-backed implementation, but accepts any
 * object implementing the documented `getSymbolSentimentData(symbol)`
 * interface.
 */
async function generateReport(symbol, { provider = defaultProvider } = {}) {
  const metrics = await provider.getSymbolSentimentData(symbol);

  if (!metrics.dataAvailable) {
    return buildUnavailableReport(symbol, metrics.asOf, metrics.unavailableReason, metrics);
  }

  const dailySeries = buildDailySeries(metrics.articles, { lookbackDays: metrics.lookbackDays, asOf: new Date(metrics.asOf) });
  const sentimentScore = computeSentimentScore(metrics.articles);
  const sentimentState = computeSentimentState(sentimentScore);
  const { trend: sentimentTrend, velocity: sentimentVelocity } = analyzeTrendAndVelocity(dailySeries);

  const articleRatio = analyzeArticleRatio(metrics.articles);
  const sourceQuality = analyzeSourceQuality(metrics.articles);
  const abnormalActivity = detectAbnormalActivity(dailySeries);
  const { divergence, priceDirection, priceChangePercent } = analyzeSentimentPriceDivergence(sentimentTrend, metrics.priceBars);

  const bullishFactors = buildBullishFactors({ sentimentState, sentimentScore, trend: sentimentTrend, velocity: sentimentVelocity, articleRatio, divergence, priceChangePercent });
  const bearishFactors = buildBearishFactors({ sentimentState, sentimentScore, trend: sentimentTrend, velocity: sentimentVelocity, articleRatio, divergence, priceChangePercent });
  const risks = buildRisks({
    socialSentimentAvailable: metrics.socialAvailable,
    socialUnavailableReason: metrics.socialUnavailableReason,
    sourceQuality,
    articleCount: metrics.articles.length,
    abnormalActivity,
  });

  const confidence = computeConfidence({
    newsAvailable: true,
    articleCount: metrics.articles.length,
    sourceQuality,
    socialAvailable: metrics.socialAvailable,
    hasAbnormalActivity: abnormalActivity.hasAbnormalActivity,
  });
  const dataQuality = assessDataQuality(metrics, sourceQuality, confidence.confidence);

  const report = {
    symbol: metrics.symbol,
    generatedAt: metrics.asOf,
    dataAvailable: true,
    signalEligible: dataQuality.signalEligible,
    dataQuality,
    unavailableReason: null,
    sentimentState,
    sentimentTrend,
    sentimentScore,
    sentimentVelocity,
    sourceQuality,
    abnormalActivity,
    articleRatio,
    divergence: { divergence, priceDirection, priceChangePercent },
    bullishFactors,
    bearishFactors,
    risks,
    confidence,
    // Retained for auditability/debugging — every number above traces
    // back to these real, already-fetched inputs.
    inputs: metrics,
  };
  report.aiSummary = generateAiSummary(report);
  return report;
}

module.exports = { generateReport, createSentimentDataProvider, assessDataQuality };
