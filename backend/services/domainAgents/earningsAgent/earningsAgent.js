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
const MAX_EARNINGS_AGE_DAYS = 180;

function parsePeriodDate(period) {
  if (!period || !/^\d{4}-\d{2}-\d{2}/.test(String(period))) return null;
  const timestamp = Date.parse(period);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function assessDataQuality(metrics) {
  const observedFundamentals = [
    metrics.revenue?.growthYoY,
    metrics.eps?.growthYoY,
    metrics.margins?.netProfitMargin,
    metrics.margins?.grossMargin,
    metrics.cashFlow?.freeCashFlowGrowthYoY,
  ].filter(Number.isFinite).length;
  const usableEpsQuarters = (metrics.epsHistory || []).filter((row) => Number.isFinite(row.actual)).length;
  const periodTimestamps = (metrics.epsHistory || []).map((row) => parsePeriodDate(row.period)).filter(Number.isFinite);
  const latestPeriod = periodTimestamps.length ? new Date(Math.max(...periodTimestamps)).toISOString().slice(0, 10) : null;
  const asOfTimestamp = Date.parse(metrics.asOf);
  const ageDays = latestPeriod && Number.isFinite(asOfTimestamp)
    ? Math.max(0, Math.floor((asOfTimestamp - Date.parse(latestPeriod)) / 86400000))
    : null;
  const stale = ageDays !== null && ageDays > MAX_EARNINGS_AGE_DAYS;
  const forwardEvidence = [metrics.guidance?.direction, metrics.analystRevisions?.direction].filter(Boolean);
  const forwardEvidenceCount = forwardEvidence.length;
  const signalEligible = metrics.dataAvailable && observedFundamentals >= 2 && usableEpsQuarters >= 2 && !stale && forwardEvidenceCount >= 1;
  return {
    source: metrics.sourceProvider || "Unknown",
    observedFundamentals,
    usableEpsQuarters,
    latestPeriod,
    ageDays,
    stale,
    forwardEvidenceCount,
    signalEligible,
    blockers: [
      ...(observedFundamentals < 2 ? ["Fewer than two verified fundamental measures are available."] : []),
      ...(usableEpsQuarters < 2 ? ["Fewer than two reported EPS quarters are available."] : []),
      ...(stale ? [`Latest earnings period is ${ageDays} days old.`] : []),
      ...(forwardEvidenceCount < 1 ? ["No verified forward guidance or analyst-revision evidence is available; historical results cannot be used as a forecast."] : []),
    ],
  };
}

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
  const dataQuality = assessDataQuality(metrics);

  return {
    symbol: metrics.symbol,
    generatedAt: metrics.asOf,
    dataAvailable: metrics.dataAvailable,
    unavailableReason: metrics.unavailableReason,
    sourceProvider: metrics.sourceProvider || null,
    primaryUnavailableReason: metrics.primaryUnavailableReason || null,
    earningsHealth: health.earningsHealth,
    growthScore: growth.growthScore,
    surpriseScore: surprise.surpriseScore,
    consistency: surprise.consistency,
    forwardOutlook: outlook.outlook,
    confidence,
    signalEligible: dataQuality.signalEligible,
    dataQuality,
    risks,
    opportunities,
    aiSummary,
    // Retained for auditability/debugging — every number above traces
    // back to these real, already-fetched inputs.
    inputs: metrics,
  };
}

module.exports = { generateReport, createFinnhubEarningsDataProvider, assessDataQuality, MAX_EARNINGS_AGE_DAYS };
