// Phase OPTIONS-AGENT-001 — "Build the first production Domain
// Intelligence Agent." This module is the reusable analysis engine;
// backend/services/agentOrchestrator/agents/optionsAgent.js (updated in
// this same phase) is the thin adapter wiring it into the generic Agent
// interface every other agent already implements — the same
// engine-vs-adapter split this project used for technicalAgent and
// sentimentAgent (the real analysis lives in its own service, the
// orchestrator-facing file just shapes the output).
const { createInternalOptionsDataProvider } = require("./optionsDataProvider");
const { analyzeMarketBias } = require("./marketBiasAnalyzer");
const { buildSignals } = require("./signalsAnalyzer");
const { buildRiskSummary } = require("./riskSummary");
const { buildAiSummary } = require("./aiSummary");

const defaultProvider = createInternalOptionsDataProvider();

const MINIMUM_SIGNAL_CONFIDENCE = 50;

function assessDataQuality(metrics, confidence = 0) {
  const totalVolume = Number(metrics?.optionVolume?.total) || 0;
  const isLicensedIntraday = metrics?.dataFreshness === "intraday";
  const isOccEod = metrics?.sourceProvider === "OCC Volume Query";
  const unusualContractCount = metrics?.unusualContracts?.length || 0;
  const eodActivityLevel = metrics?.historicalContext?.activityLevel || null;
  const eodVolumeVsAverage = Number(metrics?.historicalContext?.volumeVsAverage);
  const sourceLinked = Boolean(metrics?.sourceUrl) || isLicensedIntraday;
  const dataBlockers = [
    ...(!metrics?.dataAvailable ? [metrics?.unavailableReason || "Options data is unavailable."] : []),
    ...(totalVolume <= 0 ? ["No reported option volume was available for the symbol."] : []),
    ...(!sourceLinked ? ["The options observation has no provider audit link."] : []),
  ];
  const unusualFlowEligible = Boolean(metrics?.dataAvailable) && isLicensedIntraday && unusualContractCount > 0;
  const eodAnomalyEligible = Boolean(metrics?.dataAvailable) && isOccEod && eodActivityLevel === "UNUSUALLY_HIGH";
  const anomalyVerified = unusualFlowEligible || eodAnomalyEligible;
  const signalBlockers = [
    ...dataBlockers,
    ...(!anomalyVerified ? ["No verified unusual options activity was detected versus the available baseline."] : []),
    ...(confidence < MINIMUM_SIGNAL_CONFIDENCE ? [`Options-direction confidence is only ${confidence}/100.`] : []),
  ];
  return {
    source: metrics?.sourceProvider || "unavailable",
    sourceUrl: metrics?.sourceUrl || null,
    freshness: metrics?.dataFreshness || null,
    totalVolume,
    unusualContractCount,
    eodActivityLevel,
    eodVolumeVsAverage: Number.isFinite(eodVolumeVsAverage) ? eodVolumeVsAverage : null,
    baselineSessions: Number(metrics?.historicalContext?.baselineSessions) || 0,
    openInterestAvailable: Number.isFinite(Number(metrics?.openInterest?.total)),
    scope: isOccEod ? "end-of-day customer volume; not unusual real-time flow" : isLicensedIntraday ? "licensed intraday options flow" : "unavailable",
    blockers: signalBlockers,
    dataBlockers,
    anomalyVerified,
    signalEligible: Boolean(metrics?.dataAvailable) && signalBlockers.length === 0,
    unusualFlowEligible,
    eodAnomalyEligible,
  };
}

/**
 * Generates the full normalized Options Flow Intelligence report for one
 * symbol. `provider` defaults to the internal, DB-backed implementation
 * but accepts any object implementing optionsDataProvider.js's
 * `getSymbolMetrics(symbol)` interface — this is the seam a future real
 * IV/Greeks vendor plugs into without any other line in this file
 * changing.
 */
async function generateReport(symbol, { provider = defaultProvider } = {}) {
  const metrics = await provider.getSymbolMetrics(symbol);
  const bias = analyzeMarketBias(metrics);
  const signals = buildSignals(metrics);
  const risk = buildRiskSummary({ metrics, bias, signals });
  const dataQuality = assessDataQuality(metrics, bias.confidence);
  const aiSummary = buildAiSummary({ metrics, bias, signals, risk, dataQuality });

  return {
    symbol: metrics.symbol,
    generatedAt: metrics.asOf,
    dataAvailable: metrics.dataAvailable,
    signalEligible: dataQuality.signalEligible,
    unusualFlowEligible: dataQuality.unusualFlowEligible,
    dataQuality,
    unavailableReason: metrics.unavailableReason,
    marketBias: bias.bias,
    confidence: bias.confidence,
    signals,
    riskSummary: risk,
    aiSummary,
    // Retained for auditability/debugging — every number above traces
    // back to these real, already-fetched inputs.
    inputs: metrics,
  };
}

module.exports = { generateReport, createInternalOptionsDataProvider, assessDataQuality, MINIMUM_SIGNAL_CONFIDENCE };
