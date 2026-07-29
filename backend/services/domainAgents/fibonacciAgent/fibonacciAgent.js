// Phase FIBONACCI-AGENT-001 — "Build the Fibonacci Intelligence Agent."
// This module is the reusable analysis engine, composing every piece
// this mission requires (Trend Context, Primary Swing, Retracement
// Levels, Extension Targets, Confluence Score, High Probability Zones,
// Entry Zone, Risk Zone, Confidence, AI Summary) from real,
// already-computed indicators.
// backend/services/agentOrchestrator/agents/fibonacciAgent.js is the
// thin adapter wiring it into the generic Agent interface — the same
// engine-vs-adapter split every domain agent this session uses.
const { createFibonacciDataProvider } = require("./fibonacciDataProvider");
const { detectPrimarySwing } = require("./swingDetector");
const { calculateRetracementLevels } = require("./retracementCalculator");
const { calculateExtensionTargets } = require("./extensionCalculator");
const { analyzeDynamicLevels } = require("./dynamicSupportResistanceAnalyzer");
const { analyzePriceReactionHistory } = require("./priceReactionHistory");
const { analyzeTimeframeAgreement } = require("./multiTimeframeAnalyzer");
const { findConfluenceZones, selectHighProbabilityZones } = require("./confluenceZoneAnalyzer");
const { determineZones } = require("./entryRiskZoneAnalyzer");
const { analyzeTrendContext } = require("./trendContextAnalyzer");
const { computeConfidence } = require("./confidenceModel");
const { generateAiSummary } = require("./aiSummary");

const defaultProvider = createFibonacciDataProvider();
const WEEKLY_SWING_LOOKBACK = 52;

function buildUnavailableReport(symbol, asOf, reason, inputs) {
  const report = {
    symbol,
    generatedAt: asOf,
    dataAvailable: false,
    unavailableReason: reason,
    trendContext: "NEUTRAL",
    primarySwing: null,
    retracementLevels: null,
    extensionTargets: null,
    confluenceZones: [],
    highProbabilityZones: [],
    entryZone: null,
    riskZone: null,
    timeframeAgreement: "UNKNOWN",
    confidence: { confidence: 0, components: { base: 0, confluenceBonus: 0, agreementDelta: 0, reactionBonus: 0 } },
    inputs,
  };
  report.aiSummary = generateAiSummary(report);
  return report;
}

function averageReactionStrength(reactions) {
  const usable = reactions.filter((reaction) => Number.isFinite(reaction.reactionStrength));
  if (!usable.length) return null;
  return usable.reduce((sum, reaction) => sum + reaction.reactionStrength, 0) / usable.length;
}

/**
 * Generates the full normalized Fibonacci Intelligence report for one
 * symbol. `provider` defaults to the real, already-tested
 * priceHistoryProvider/technicalIntelligenceService-backed
 * implementation, but accepts any object implementing the documented
 * `getSymbolFibonacciData(symbol)` interface.
 */
async function generateReport(symbol, { provider = defaultProvider } = {}) {
  const metrics = await provider.getSymbolFibonacciData(symbol);

  if (!metrics.dataAvailable) {
    return buildUnavailableReport(symbol, metrics.asOf, metrics.unavailableReason, metrics);
  }

  const trendContext = analyzeTrendContext(metrics.dailyTrendSignal);
  const dailySwing = detectPrimarySwing(metrics.dailyBars);
  const weeklySwing = detectPrimarySwing(metrics.weeklyBars, WEEKLY_SWING_LOOKBACK);

  const timeframe = analyzeTimeframeAgreement(dailySwing, weeklySwing, metrics.dailyTrendSignal, metrics.weeklyTrendSignal);
  const dynamicLevels = analyzeDynamicLevels(metrics.dailyBars);

  const retracementLevels = calculateRetracementLevels(dailySwing);
  const extensionTargets = calculateExtensionTargets(dailySwing);

  const allLevels = [
    ...(retracementLevels || []).map((level) => ({ price: level.price, source: `Fibonacci ${level.ratio} retracement` })),
    ...(extensionTargets || []).map((level) => ({ price: level.price, source: `Fibonacci ${level.ratio} extension` })),
    ...dynamicLevels,
  ];

  const confluenceZones = findConfluenceZones(allLevels);
  const highProbabilityZones = selectHighProbabilityZones(confluenceZones);
  const reactions = analyzePriceReactionHistory(metrics.dailyBars, allLevels);
  const avgReactionStrength = averageReactionStrength(reactions);

  const { entryZone, riskZone } = determineZones({
    zones: confluenceZones,
    currentPrice: metrics.currentPrice,
    direction: dailySwing?.direction || null,
  });

  const confidence = computeConfidence({
    dataAvailable: true,
    enoughDataStatus: metrics.enoughDataStatus,
    entryZone,
    timeframeAgreement: timeframe.agreement,
    avgReactionStrength,
  });

  const report = {
    symbol: metrics.symbol,
    generatedAt: metrics.asOf,
    dataAvailable: true,
    unavailableReason: null,
    trendContext,
    primarySwing: dailySwing,
    retracementLevels,
    extensionTargets,
    confluenceZones,
    highProbabilityZones,
    entryZone,
    riskZone,
    timeframeAgreement: timeframe.agreement,
    confidence,
    // Retained for auditability/debugging — every number above traces
    // back to these real, already-fetched inputs.
    inputs: metrics,
  };
  report.aiSummary = generateAiSummary(report);
  return report;
}

module.exports = { generateReport, createFibonacciDataProvider };
