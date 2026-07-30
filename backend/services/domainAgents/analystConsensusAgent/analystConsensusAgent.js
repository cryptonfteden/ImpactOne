// Phase ANALYST-CONSENSUS-AGENT-001 — "Build the Analyst Consensus
// Intelligence Agent." This module is the reusable analysis engine,
// composing every piece this mission requires (Analyst Bias, Consensus
// Score, Revision Score, Target Score, Coverage Quality, Conviction
// Score, Rating Trend, Risks, Opportunities, Confidence, AI Summary)
// from real, per-symbol Finnhub analyst-rating data — never
// fabricating analyst data, honestly reporting unavailable fields
// where no real provider exists (price targets, price-target
// revisions, target dispersion, and estimate revisions all require a
// paid Finnhub plan, confirmed via a real HTTP 403 in this
// environment).
const { createAnalystDataProvider } = require("./analystDataProvider");
const { analyzeConsensusScore } = require("./consensusScoreAnalyzer");
const { analyzeAnalystBias } = require("./analystBiasAnalyzer");
const { analyzeRatingTrend } = require("./ratingTrendAnalyzer");
const { analyzeCoverageQuality } = require("./coverageQualityAnalyzer");
const { analyzeConviction } = require("./convictionScoreAnalyzer");
const { analyzeTargetScore } = require("./targetScoreAnalyzer");
const { computeConfidence } = require("./confidenceModel");
const { buildOpportunities, buildRisks } = require("./risksOpportunitiesBuilder");
const { generateAiSummary } = require("./aiSummary");

const defaultProvider = createAnalystDataProvider();

function buildUnavailableReport(symbol, asOf, reason, inputs) {
  const report = {
    symbol,
    generatedAt: asOf,
    dataAvailable: false,
    unavailableReason: reason,
    analystBias: "UNKNOWN",
    consensusScore: null,
    revisionScore: null,
    targetScore: null,
    targetDispersion: null,
    coverageQuality: "UNKNOWN",
    totalAnalysts: 0,
    convictionScore: null,
    ratingTrend: "UNKNOWN",
    risks: [],
    opportunities: [],
    confidence: 0,
    inputs,
  };
  report.aiSummary = generateAiSummary(report);
  return report;
}

/**
 * Generates the full normalized Analyst Consensus Intelligence report
 * for one symbol. `provider` defaults to the real, already-tested
 * Finnhub-backed implementation, but accepts any object implementing
 * the documented `getSymbolAnalystData(symbol)` interface.
 */
async function generateReport(symbol, { provider = defaultProvider } = {}) {
  const metrics = await provider.getSymbolAnalystData(symbol);

  if (!metrics.dataAvailable) {
    return buildUnavailableReport(metrics.symbol, metrics.asOf, metrics.unavailableReason, metrics);
  }

  const { consensusScore, totalAnalysts, latestPeriod } = analyzeConsensusScore(metrics.periods);
  const analystBias = analyzeAnalystBias(consensusScore);
  const { ratingTrend, revisionScore } = analyzeRatingTrend(metrics.periods);
  const { coverageQuality } = analyzeCoverageQuality(totalAnalysts);
  const { convictionScore } = analyzeConviction(latestPeriod);
  const { targetScore, targetDispersion } = analyzeTargetScore(metrics.priceTargets);

  const confidenceResult = computeConfidence({
    dataAvailable: true,
    periodCount: metrics.periods.length,
    coverageQuality,
    priceTargetsAvailable: metrics.priceTargets.dataAvailable,
  });

  const opportunities = buildOpportunities({ analystBias, consensusScore, ratingTrend, convictionScore, coverageQuality });
  const risks = buildRisks({
    analystBias,
    consensusScore,
    ratingTrend,
    coverageQuality,
    priceTargetsAvailable: metrics.priceTargets.dataAvailable,
    priceTargetUnavailableReason: metrics.priceTargets.unavailableReason,
    confidence: confidenceResult.confidence,
  });

  const report = {
    symbol: metrics.symbol,
    generatedAt: metrics.asOf,
    dataAvailable: true,
    unavailableReason: null,
    analystBias,
    consensusScore,
    revisionScore,
    targetScore,
    targetDispersion,
    coverageQuality,
    totalAnalysts,
    convictionScore,
    ratingTrend,
    risks,
    opportunities,
    confidence: confidenceResult.confidence,
    // Retained for auditability/debugging — every field above traces
    // back to these real, already-fetched inputs.
    inputs: metrics,
    details: { confidence: confidenceResult },
  };
  report.aiSummary = generateAiSummary(report);
  return report;
}

module.exports = { generateReport, createAnalystDataProvider };
