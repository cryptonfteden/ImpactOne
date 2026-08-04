// Phase ETF-FLOW-AGENT-001 — "Build the ETF Flow Intelligence Agent."
// This module is the reusable analysis engine, composing every piece
// this mission requires (ETF Flow Bias, Net Flow Score, Flow Strength,
// Flow Persistence, Sector Rotation, Passive Flow Impact, Stock ETF
// Exposure, Risks, Opportunities, Confidence, AI Summary) from real
// price/volume data — never fabricating true fund-flow figures no
// licensed vendor in this environment can supply.
// backend/services/agentOrchestrator/agents/etfFlowAgent.js is the thin
// adapter wiring it into the generic Agent interface — the same
// engine-vs-adapter split every domain agent this session uses.
const { createEtfFlowDataProvider } = require("./etfFlowDataProvider");
const { computeDailyWeeklyMonthlyFlows } = require("./flowProxyCalculator");
const { analyzeFlowAcceleration } = require("./flowAccelerationAnalyzer");
const { analyzeFlowPersistence } = require("./flowPersistenceAnalyzer");
const { analyzeFlowStrength } = require("./flowStrengthAnalyzer");
const { analyzeSectorRotation } = require("./sectorRotationAnalyzer");
const { analyzePassiveActiveImpact } = require("./passiveActiveAnalyzer");
const { analyzeNetFlowScore } = require("./netFlowScoreAnalyzer");
const { analyzeFundConcentration } = require("./fundConcentrationAnalyzer");
const { analyzeStockExposure } = require("./stockExposureAnalyzer");
const { computeConfidence } = require("./confidenceModel");
const { buildOpportunities, buildRisks } = require("./risksOpportunitiesBuilder");
const { generateAiSummary } = require("./aiSummary");

const defaultProvider = createEtfFlowDataProvider();

function buildUnavailableReport(symbol, asOf, reason, inputs) {
  const report = {
    symbol,
    generatedAt: asOf,
    dataAvailable: false,
    unavailableReason: reason,
    targetEtf: null,
    isDirectEtf: false,
    sector: null,
    etfFlowBias: "NEUTRAL",
    netFlowScore: 0,
    flowStrength: { classification: "UNKNOWN", strengthRatio: null },
    flowPersistence: { classification: "UNKNOWN", persistenceRatio: null, dominantDirection: null },
    sectorRotation: { classification: "UNKNOWN", relativeStrengthPercent: null },
    passiveFlowImpact: { classification: "UNKNOWN", direction: null, magnitudeTier: "UNKNOWN" },
    stockEtfExposure: { dataAvailable: false, unavailableReason: reason, exposureEstimate: null },
    fundConcentration: { dataAvailable: false, unavailableReason: "No data available.", topHoldingsWeightPercent: null },
    risks: [],
    opportunities: [],
    confidence: { confidence: 0, components: { base: 0, directnessBonus: 0, sampleBonus: 0, persistenceBonus: 0, structuralPenalty: 0 } },
    inputs,
  };
  report.aiSummary = generateAiSummary(report);
  return report;
}

/**
 * Generates the full normalized ETF Flow Intelligence report for one
 * symbol (a stock symbol resolves to its sector ETF as a proxy target;
 * a recognized ETF symbol is analyzed directly). `provider` defaults to
 * the real, price-history/Finnhub-backed implementation, but accepts
 * any object implementing the documented `getSymbolEtfFlowData(symbol)`
 * interface.
 */
async function generateReport(symbol, { provider = defaultProvider } = {}) {
  const metrics = await provider.getSymbolEtfFlowData(symbol);

  if (!metrics.dataAvailable) {
    return buildUnavailableReport(symbol, metrics.asOf, metrics.unavailableReason, metrics);
  }

  const flows = computeDailyWeeklyMonthlyFlows(metrics.etfBars);
  const flowAcceleration = analyzeFlowAcceleration(flows);
  const flowPersistence = analyzeFlowPersistence(metrics.etfBars);
  const flowStrength = analyzeFlowStrength(metrics.etfBars, flows.monthly);
  const sectorRotation = analyzeSectorRotation(flows.monthly, metrics.marketBars);
  const passiveFlowImpact = analyzePassiveActiveImpact(metrics.passiveActiveClassification, flows.monthly);
  const { etfFlowBias, netFlowScore } = analyzeNetFlowScore(flows);
  const fundConcentration = analyzeFundConcentration();
  const stockEtfExposure = analyzeStockExposure({ isDirectEtf: metrics.isDirectEtf });

  const confidence = computeConfidence({
    dataAvailable: true,
    isDirectEtf: metrics.isDirectEtf,
    barsCount: metrics.etfBars.length,
    persistenceClassification: flowPersistence.classification,
  });

  const opportunities = buildOpportunities({ etfFlowBias, netFlowScore, sectorRotation, flowAcceleration, flowPersistence });
  const risks = buildRisks({ etfFlowBias, sectorRotation, flowAcceleration, flowPersistence, isDirectEtf: metrics.isDirectEtf, barsCount: metrics.etfBars.length });

  const report = {
    symbol: metrics.symbol,
    generatedAt: metrics.asOf,
    dataAvailable: true,
    unavailableReason: null,
    targetEtf: metrics.targetEtf,
    isDirectEtf: metrics.isDirectEtf,
    sector: metrics.sector,
    etfFlowBias,
    netFlowScore,
    flowStrength,
    flowPersistence,
    sectorRotation,
    passiveFlowImpact,
    stockEtfExposure,
    fundConcentration,
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

module.exports = { generateReport, createEtfFlowDataProvider };
