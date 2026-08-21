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
const { buildEventClusters } = require("./eventClusterAnalyzer");

const defaultProvider = createNewsDataProvider();
const MIN_SIGNAL_IMPORTANCE = 60;
const MIN_SIGNAL_CONFIRMATION = 40;
const MIN_SIGNAL_CONFIDENCE = 60;

function isCompanyRelevant(article, symbol, companyName) {
  const titleAndDescription = `${article.title || ""} ${article.description || ""}`;
  const normalized = titleAndDescription.toLowerCase();
  const exactSymbol = String(symbol || "").replace(/[^A-Za-z0-9.-]/g, "");
  const symbolRegex = exactSymbol ? new RegExp(`(^|[^A-Za-z0-9])${exactSymbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^A-Za-z0-9]|$)`, "i") : null;
  const companyTokens = String(companyName || "")
    .toLowerCase()
    .replace(/\b(inc|corp|corporation|company|ltd|plc|holdings?)\b/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 4);
  return Boolean((symbolRegex && symbolRegex.test(titleAndDescription)) || companyTokens.some((token) => normalized.includes(token)));
}

function assessDataQuality(metrics, classifiedArticles, companyArticles, confirmationScore, freshnessScore, importanceScore, confidence, eventClusters) {
  const uniqueSources = new Set(companyArticles.map((article) => article.source).filter(Boolean)).size;
  const sourceLinkedCount = companyArticles.filter((article) => /^https?:\/\//i.test(String(article.url || ""))).length;
  const strategicThemeCount = classifiedArticles.filter((article) => article.strategicThemes?.length).length;
  const confirmedClusters = eventClusters.filter((cluster) => cluster.sourceCount >= 2 && cluster.sourceLinkedCount >= 2);
  const independentlyConfirmedEvent = confirmedClusters.length > 0;
  const signalEligible = companyArticles.length >= 2
    && independentlyConfirmedEvent
    && freshnessScore >= 40
    && confirmationScore >= MIN_SIGNAL_CONFIRMATION
    && importanceScore >= MIN_SIGNAL_IMPORTANCE
    && confidence >= MIN_SIGNAL_CONFIDENCE;
  return {
    source: metrics.sourceProvider || "Unknown",
    fetchedArticleCount: metrics.articles.length,
    companyRelevantCount: companyArticles.length,
    uniqueCompanySources: uniqueSources,
    sourceLinkedCount,
    strategicThemeCount,
    eventClusterCount: eventClusters.length,
    independentlyConfirmedEventCount: confirmedClusters.length,
    independentlyConfirmedEvent,
    signalEligible,
    blockers: [
      ...(companyArticles.length < 2 ? ["Fewer than two company-relevant articles were verified."] : []),
      ...(!independentlyConfirmedEvent ? ["No single company event was independently confirmed by two source-linked reports."] : []),
      ...(sourceLinkedCount < 2 ? ["Fewer than two source links are available for evidence review."] : []),
      ...(freshnessScore < 40 ? ["The verified company news is not fresh enough for a live signal."] : []),
      ...(confirmationScore < MIN_SIGNAL_CONFIRMATION ? [`Cross-source confirmation is below ${MIN_SIGNAL_CONFIRMATION}/100.`] : []),
      ...(importanceScore < MIN_SIGNAL_IMPORTANCE ? [`Market importance is below ${MIN_SIGNAL_IMPORTANCE}/100.`] : []),
      ...(confidence < MIN_SIGNAL_CONFIDENCE ? [`Evidence confidence is below ${MIN_SIGNAL_CONFIDENCE}/100.`] : []),
    ],
  };
}

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
    signalEligible: false,
    dataQuality: { source: inputs?.sourceProvider || null, signalEligible: false, blockers: [reason] },
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
  const companyArticles = classifiedArticles.filter((article) => isCompanyRelevant(article, metrics.symbol, metrics.profile.companyName));
  const scoringArticles = companyArticles;

  if (!scoringArticles.length) {
    return buildUnavailableReport(metrics.symbol, metrics.asOf, "Articles were fetched, but none could be verified as company-specific.", metrics);
  }

  const { freshnessScore, isBreaking } = analyzeFreshness(scoringArticles);
  const { confirmationScore } = analyzeConfirmation(scoringArticles);
  const { importanceScore } = analyzeImportance(freshnessScore, confirmationScore, scoringArticles);
  const { persistenceClassification } = analyzePersistence(scoringArticles);
  const impactHorizon = analyzeImpactHorizon(importanceScore, isBreaking, persistenceClassification);
  const affectedSectors = analyzeAffectedSectors(metrics.profile, classifiedArticles);
  const { newsBias, newsScore, positiveCount, negativeCount } = analyzeNewsBiasScore(scoringArticles);
  const eventClusters = buildEventClusters(scoringArticles);

  const confidenceResult = computeConfidence({
    dataAvailable: true,
    articleCount: scoringArticles.length,
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
  const dataQuality = assessDataQuality(metrics, classifiedArticles, companyArticles, confirmationScore, freshnessScore, importanceScore, confidenceResult.confidence, eventClusters);

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
    signalEligible: dataQuality.signalEligible,
    dataQuality,
    // Retained for auditability/debugging — every field above traces
    // back to these real, already-fetched inputs.
    inputs: metrics,
    details: {
      classifiedArticles,
      companyArticles,
      strategicThemeArticles: classifiedArticles.filter((article) => article.strategicThemes?.length),
      eventClusters,
      persistenceClassification,
      isBreaking,
      confidence: confidenceResult,
    },
  };
  report.aiSummary = generateAiSummary(report);
  return report;
}

module.exports = {
  generateReport,
  createNewsDataProvider,
  isCompanyRelevant,
  assessDataQuality,
  MIN_SIGNAL_IMPORTANCE,
  MIN_SIGNAL_CONFIRMATION,
  MIN_SIGNAL_CONFIDENCE,
};
