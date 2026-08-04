// Phase INSTITUTIONAL-AGENT-001 — "Build the Institutional Intelligence
// Agent." This module is the reusable analysis engine, composing every
// piece this mission requires (Institutional Bias, Institutional
// Score, Ownership Trend, Accumulation Score, Distribution Score,
// Conviction Score, Top Holders, New Positions, Closed Positions,
// Risks, Opportunities, Confidence, AI Summary) from real SEC EDGAR
// 13F data — never fabricating institutional ownership.
// backend/services/agentOrchestrator/agents/institutionalAgent.js is
// the thin adapter wiring it into the generic Agent interface — the
// same engine-vs-adapter split every domain agent this session uses.
const { createInstitutionalDataProvider } = require("./institutionalDataProvider");
const { INSTITUTIONAL_MANAGERS } = require("./institutionalManagerReference");
const { analyzeOwnershipTrend } = require("./ownershipChangeAnalyzer");
const { analyzeAccumulationDistribution } = require("./accumulationDistributionAnalyzer");
const { analyzeNewClosedPositions } = require("./newClosedPositionsAnalyzer");
const { analyzeTopHolders } = require("./topHoldersAnalyzer");
const { analyzeConviction } = require("./convictionAnalyzer");
const { analyzeInstitutionalScore } = require("./institutionalScoreAnalyzer");
const { computeConfidence } = require("./confidenceModel");
const { buildOpportunities, buildRisks } = require("./risksOpportunitiesBuilder");
const { generateAiSummary } = require("./aiSummary");

const defaultProvider = createInstitutionalDataProvider();

function buildUnavailableReport(symbol, asOf, reason, inputs) {
  const report = {
    symbol,
    generatedAt: asOf,
    dataAvailable: false,
    unavailableReason: reason,
    institutionalBias: "NEUTRAL",
    institutionalScore: 0,
    ownershipTrend: { trend: "UNKNOWN", currentTotalShares: 0, priorTotalShares: 0, comparableManagerCount: 0 },
    accumulationScore: 0,
    distributionScore: 0,
    convictionScore: 0,
    smartMoneyParticipation: 0,
    topHolders: [],
    newPositions: [],
    closedPositions: [],
    risks: [],
    opportunities: [],
    confidence: { confidence: 0, components: { base: 0, coverageBonus: 0, comparableBonus: 0, convictionBonus: 0, structuralPenalty: 0 } },
    inputs,
  };
  report.aiSummary = generateAiSummary(report);
  return report;
}

/**
 * Generates the full normalized Institutional Intelligence report for
 * one symbol. `provider` defaults to the real, SEC-EDGAR-13F-backed
 * implementation, but accepts any object implementing the documented
 * `getSymbolInstitutionalData(symbol)` interface.
 */
async function generateReport(symbol, { provider = defaultProvider } = {}) {
  const metrics = await provider.getSymbolInstitutionalData(symbol);

  if (!metrics.dataAvailable) {
    return buildUnavailableReport(symbol, metrics.asOf, metrics.unavailableReason, metrics);
  }

  const { managerPositions } = metrics;

  const ownershipTrend = analyzeOwnershipTrend(managerPositions);
  const accumulationDistribution = analyzeAccumulationDistribution(managerPositions);
  const newClosedPositions = analyzeNewClosedPositions(managerPositions);
  const topHolders = analyzeTopHolders(managerPositions);
  const convictionAnalysis = analyzeConviction(managerPositions);
  const { institutionalBias, institutionalScore } = analyzeInstitutionalScore(accumulationDistribution, newClosedPositions);

  const checkedCount = managerPositions.filter((position) => position.checked).length;

  const confidence = computeConfidence({
    dataAvailable: true,
    totalManagers: INSTITUTIONAL_MANAGERS.length,
    checkedCount,
    comparableManagerCount: ownershipTrend.comparableManagerCount,
    convictionScore: convictionAnalysis.convictionScore,
  });

  const opportunities = buildOpportunities({ institutionalBias, institutionalScore, accumulationDistribution, newClosedPositions, convictionAnalysis });
  const risks = buildRisks({ institutionalBias, accumulationDistribution, newClosedPositions, checkedCount, totalManagers: INSTITUTIONAL_MANAGERS.length });

  const report = {
    symbol: metrics.symbol,
    generatedAt: metrics.asOf,
    dataAvailable: true,
    unavailableReason: null,
    institutionalBias,
    institutionalScore,
    ownershipTrend,
    accumulationScore: accumulationDistribution.accumulationScore,
    distributionScore: accumulationDistribution.distributionScore,
    convictionScore: convictionAnalysis.convictionScore,
    smartMoneyParticipation: convictionAnalysis.participationRate,
    topHolders,
    newPositions: newClosedPositions.newPositions,
    closedPositions: newClosedPositions.closedPositions,
    risks,
    opportunities,
    confidence,
    // Retained for auditability/debugging — every number above traces
    // back to these real, already-fetched inputs.
    inputs: metrics,
  };
  report.aiSummary = generateAiSummary(report);
  return report;
}

module.exports = { generateReport, createInstitutionalDataProvider };
