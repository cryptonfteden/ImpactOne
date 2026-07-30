// Phase NEWS-AGENT-001 — "Build the News Intelligence Agent." This
// module is the reusable analysis engine, composing every piece this
// mission requires (News Bias, News Score, Importance Score, Freshness
// Score, Confirmation Score, Impact Horizon, Affected Sectors, Bullish/
// Bearish Factors, Risks, Confidence, AI Summary) from real, per-symbol
// news data. Per this mission's own "Reuse existing news
// infrastructure wherever possible," this reuses SENTIMENT-AGENT-001's
// real NewsAPI provider, source-quality analyzer, and article-sentiment
// scorer rather than duplicating them — never fabricating news,
// honestly reporting unavailable when no verified news exists.
const { createNewsDataProvider } = require("./newsDataProvider");
const { classifyArticles } = require("./eventClassifier");
const { analyzeFreshness } = require("./freshnessAnalyzer");
const { analyzeConfirmation } = require("./confirmationAnalyzer");
const { analyzeImportance } = require("./importanceAnalyzer");
const { analyzePersistence } = require("./persistenceAnalyzer");
const { analyzeImpactHorizon } = require("./impactHorizonAnalyzer");
const { analyzeAffectedSectors } = require("./affectedSectorsAnalyzer");
const { analyzeNewsBiasScore } = require("./newsBiasScoreAnalyzer");
const { computeConfidence } = require("./confidenceModel");
const { buildBullishFactors, buildBearishFactors, buildRisks } = require("./factorsRisksBuilder");
const { generateAiSummary } = require("./aiSummary");

const defaultProvider = createNewsDataProvider();

function buildUnavailableReport(symbol, asOf, reason, inputs) {
  const report = {
    symbol,
    generatedAt: asOf,
    dataAvailable: false,
    unavailableReason: reason,
    newsBias: "UNKNOWN",
    newsScore: null,
    importanceScore: null,
    freshnessScore: null,
    confirmationScore: null,
    impactHorizon: "UNKNOWN",
    affectedSectors: [],
    bullishFactors: [],
    bearishFactors: [],
    risks: buildRisks({ freshnessScore: null, dataAvailable: false, unavailableReason: reason, confidence: 0, persistenceClassification: "UNKNOWN" }),
    confidence: 0,
    inputs,
  };
  report.aiSummary = generateAiSummary(report);
  return report;
}

/**
 * Generates the full normalized News Intelligence report for one
 * symbol. `provider` defaults to the real, already-tested
 * NewsAPI/Finnhub-backed implementation, but accepts any object
 * implementing the documented `getSymbolNewsData(symbol)` interface.
 */
async function generateReport(symbol, { provider = defaultProvider } = {}) {
  const metrics = await provider.getSymbolNewsData(symbol);

  if (!metrics.dataAvailable) {
    return buildUnavailableReport(metrics.symbol, metrics.asOf, metrics.unavailableReason, metrics);
  }

  const classifiedArticles = classifyArticles(metrics.articles, metrics.symbol, metrics.profile.companyName);

  const { freshnessScore, isBreaking } = analyzeFreshness(metrics.articles);
  const { confirmationScore } = analyzeConfirmation(metrics.articles);
  const { importanceScore } = analyzeImportance(freshnessScore, confirmationScore, metrics.articles);
  const { persistenceClassification } = analyzePersistence(metrics.articles);
  const impactHorizon = analyzeImpactHorizon(importanceScore, isBreaking, persistenceClassification);
  const affectedSectors = analyzeAffectedSectors(metrics.profile, classifiedArticles);
  const { newsBias, newsScore, positiveCount, negativeCount } = analyzeNewsBiasScore(metrics.articles);

  const confidenceResult = computeConfidence({
    dataAvailable: true,
    articleCount: metrics.articles.length,
    confirmationScore,
    profileAvailable: metrics.profile.dataAvailable,
  });

  const bullishFactors = buildBullishFactors({ newsBias, newsScore, positiveCount, importanceScore, confirmationScore });
  const bearishFactors = buildBearishFactors({ newsBias, newsScore, negativeCount, importanceScore, confirmationScore });
  const risks = buildRisks({
    freshnessScore,
    dataAvailable: true,
    unavailableReason: null,
    confidence: confidenceResult.confidence,
    persistenceClassification,
  });

  const report = {
    symbol: metrics.symbol,
    generatedAt: metrics.asOf,
    dataAvailable: true,
    unavailableReason: null,
    newsBias,
    newsScore,
    importanceScore,
    freshnessScore,
    confirmationScore,
    impactHorizon,
    affectedSectors,
    bullishFactors,
    bearishFactors,
    risks,
    confidence: confidenceResult.confidence,
    // Retained for auditability/debugging — every field above traces
    // back to these real, already-fetched inputs.
    inputs: metrics,
    details: { classifiedArticles, persistenceClassification, isBreaking, confidence: confidenceResult },
  };
  report.aiSummary = generateAiSummary(report);
  return report;
}

module.exports = { generateReport, createNewsDataProvider };
