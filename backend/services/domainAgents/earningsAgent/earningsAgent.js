// Phase EARNINGS-AGENT-001 — "Build the Earnings Intelligence Agent."
// This module is the reusable analysis engine;
// backend/services/agentOrchestrator/agents/earningsAgent.js (updated in
// this same phase) is the thin adapter wiring it into the generic Agent
// interface — the same engine-vs-adapter split OPTIONS-AGENT-001 used
// for optionsFlowAgent.js.
const { createFinnhubEarningsDataProvider } = require("./earningsDataProvider");
const { analyzeGrowth } = require("./growthAnalyzer");
const { analyzeSurprise } = require("./surpriseAnalyzer");
const { analyzeOutlook } = require("./outlookAnalyzer");
const { analyzeEarningsHealth } = require("./earningsHealthAnalyzer");
const { buildRiskOpportunity } = require("./riskOpportunity");
const { buildAiSummary } = require("./aiSummary");

const defaultProvider = createFinnhubEarningsDataProvider();

/**
 * Generates the full normalized Earnings Intelligence report for one
 * symbol. `provider` defaults to the real, Finnhub-backed
 * implementation but accepts any object implementing
 * earningsDataProvider.js's `getSymbolEarnings(symbol)` interface — this
 * is the seam a future dedicated fundamentals/earnings vendor plugs
 * into without any other line in this file changing.
 */
async function generateReport(symbol, { provider = defaultProvider } = {}) {
  const metrics = await provider.getSymbolEarnings(symbol);

  const growth = analyzeGrowth(metrics);
  const surprise = analyzeSurprise(metrics);
  const outlook = analyzeOutlook({ growth, surprise, metrics });
  const health = analyzeEarningsHealth(metrics, growth, surprise.consistency);
  const { risks, opportunities } = buildRiskOpportunity({ metrics, growth, surprise, consistency: surprise.consistency, health });
  const aiSummary = buildAiSummary({ metrics, growth, surprise, outlook, health });

  const confidence = metrics.dataAvailable ? outlook.confidenceContribution : 0;

  return {
    symbol: metrics.symbol,
    generatedAt: metrics.asOf,
    dataAvailable: metrics.dataAvailable,
    unavailableReason: metrics.unavailableReason,
    earningsHealth: health.earningsHealth,
    growthScore: growth.growthScore,
    surpriseScore: surprise.surpriseScore,
    consistency: surprise.consistency,
    forwardOutlook: outlook.outlook,
    confidence,
    risks,
    opportunities,
    aiSummary,
    // Retained for auditability/debugging — every number above traces
    // back to these real, already-fetched inputs.
    inputs: metrics,
  };
}

module.exports = { generateReport, createFinnhubEarningsDataProvider };
