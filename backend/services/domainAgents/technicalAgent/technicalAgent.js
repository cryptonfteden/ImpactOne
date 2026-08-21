// Phase TECHNICAL-AGENT-001 — "Build the Technical Analysis Intelligence
// Agent." This module is the reusable analysis engine, composing every
// piece this mission requires (Trend, Trend Strength, Momentum, Support
// Levels, Resistance Levels, Breakout Probability, Risk Level,
// Confidence, AI Summary) from real, already-computed indicators.
// backend/services/agentOrchestrator/agents/technicalAgent.js is the
// thin adapter wiring it into the generic Agent interface — the same
// engine-vs-adapter split every prior domain agent this session used.
//
// Deliberately reuses technicalIntelligenceService.js (Sprint 37's
// already-real, already-tested evidence layer) without modifying it,
// additively extending only the lower-level, pure technicalIndicators.js
// module with two new indicators (ADX, volume trend) this mission asked
// for that the existing service did not already compute.
const { createTechnicalDataProvider } = require("./technicalDataProvider");
const { analyzeTrend } = require("./trendAnalyzer");
const { analyzeMomentum } = require("./momentumAnalyzer");
const { analyzeLevels } = require("./levelsAnalyzer");
const { analyzeBreakoutProbability } = require("./breakoutProbabilityAnalyzer");
const { analyzeRiskLevel } = require("./riskLevelAnalyzer");
const { computeConfidence } = require("./confidenceModel");
const { generateAiSummary } = require("./aiSummary");

const defaultProvider = createTechnicalDataProvider();

function assessDataQuality(metrics) {
  const ageDays = Number(metrics?.freshness?.ageDays);
  const barsUsed = Number(metrics?.barsUsed) || 0;
  const blockers = [
    ...(metrics?.enoughDataStatus !== "SUFFICIENT" ? ["Indicator history is insufficient."] : []),
    ...(barsUsed < 60 ? ["Fewer than 60 daily bars were verified."] : []),
    ...(!Number.isFinite(ageDays) ? ["Latest-bar freshness is unknown."] : ageDays > 7 ? [`Latest bar is ${ageDays} days old.`] : []),
  ];
  return {
    source: "verified OHLCV price history",
    barsUsed,
    latestBarDate: metrics?.freshness?.lastBarDate || null,
    ageDays: Number.isFinite(ageDays) ? ageDays : null,
    blockers,
    signalEligible: Boolean(metrics?.dataAvailable) && blockers.length === 0,
  };
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
    trend: "NEUTRAL",
    trendStrength: 0,
    trendStrengthSource: "UNAVAILABLE",
    momentum: { state: "NEUTRAL", rsi: { value: null, signal: null }, macd: { signal: null, histogram: null } },
    levels: { supportLevels: [], resistanceLevels: [] },
    breakout: { probability: null, reason: "No data available." },
    risk: { riskLevel: "MODERATE", atrPercentOfPrice: null, volatilityRegime: null, reason: "No data available." },
    confidence: { confidence: 0, dataCompleteness: "UNAVAILABLE", agreement: "NONE", freshnessPenaltyApplied: false },
    inputs,
  };
  report.aiSummary = generateAiSummary(report);
  return report;
}

/**
 * Generates the full normalized Technical Analysis Intelligence report
 * for one symbol. `provider` defaults to the real, already-tested
 * technicalIntelligenceService/technicalIndicators-backed implementation,
 * but accepts any object implementing the documented
 * `getSymbolTechnicals(symbol)` interface — the seam a future
 * alternative price-history/indicator provider plugs into without any
 * other line in this file changing.
 */
async function generateReport(symbol, { provider = defaultProvider } = {}) {
  const metrics = await provider.getSymbolTechnicals(symbol);

  if (!metrics.dataAvailable) {
    return buildUnavailableReport(symbol, metrics.asOf, metrics.unavailableReason, metrics);
  }

  const trendResult = analyzeTrend(metrics.signals, metrics.adx);
  const momentumResult = analyzeMomentum(metrics.signals);
  const levelsResult = analyzeLevels(metrics);
  const breakoutResult = analyzeBreakoutProbability(metrics, metrics.adx);
  const riskResult = analyzeRiskLevel(metrics.signals);
  const confidenceResult = computeConfidence(metrics, trendResult.trend, momentumResult.state);
  const dataQuality = assessDataQuality(metrics);

  const report = {
    symbol: metrics.symbol,
    generatedAt: metrics.asOf,
    dataAvailable: true,
    signalEligible: dataQuality.signalEligible,
    dataQuality,
    unavailableReason: null,
    trend: trendResult.trend,
    trendStrength: trendResult.trendStrength,
    trendStrengthSource: trendResult.trendStrengthSource,
    momentum: momentumResult,
    levels: levelsResult,
    breakout: breakoutResult,
    risk: riskResult,
    confidence: confidenceResult,
    // Retained for auditability/debugging — every number above traces
    // back to these real, already-fetched inputs.
    inputs: metrics,
  };
  report.aiSummary = generateAiSummary(report);
  return report;
}

module.exports = { generateReport, createTechnicalDataProvider, assessDataQuality };
