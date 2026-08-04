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
  const aiSummary = buildAiSummary({ metrics, bias, signals, risk });

  return {
    symbol: metrics.symbol,
    generatedAt: metrics.asOf,
    dataAvailable: metrics.dataAvailable,
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

module.exports = { generateReport, createInternalOptionsDataProvider };
