// Phase INSIDER-AGENT-001 — "Build the Insider Trading Intelligence
// Agent." This module is the reusable analysis engine, composing every
// piece this mission requires (Insider Activity, Net Insider Score,
// Cluster Activity, Executive Activity, Ownership Trend, Transaction
// Significance, Confidence, Bullish/Bearish Factors, Risks, AI Summary)
// from real SEC EDGAR Form 4 data — never fabricating a transaction.
// backend/services/agentOrchestrator/agents/insiderAgent.js is the thin
// adapter wiring it into the generic Agent interface — the same
// engine-vs-adapter split every domain agent this session uses.
const { createInsiderDataProvider } = require("./insiderDataProvider");
const { analyzeNetInsiderActivity } = require("./netInsiderActivityAnalyzer");
const { analyzeOfficerDirectorActivity } = require("./officerDirectorAnalyzer");
const { analyzeExecutiveActivity } = require("./executiveActivityAnalyzer");
const { analyzeClusterActivity } = require("./clusterActivityAnalyzer");
const { analyzeTransactionSize } = require("./transactionSizeAnalyzer");
const { analyzeOwnershipTrend } = require("./ownershipTrendAnalyzer");
const { computeConfidence } = require("./confidenceModel");
const { buildBullishFactors, buildBearishFactors, buildRisks } = require("./bullishBearishFactorsBuilder");
const { generateAiSummary } = require("./aiSummary");
const { summarizeVerifiedPurchases } = require("./openMarketPurchasePolicy");

const defaultProvider = createInsiderDataProvider();

function buildUnavailableReport(symbol, asOf, reason, inputs) {
  const report = {
    symbol,
    generatedAt: asOf,
    dataAvailable: false,
    unavailableReason: reason,
    insiderActivity: "NEUTRAL",
    netInsiderScore: 0,
    clusterActivity: { clusterBuy: false, clusterSell: false, distinctBuyers: 0, distinctSellers: 0, windowDays: 30 },
    officerDirectorActivity: { officer: { buyCount: 0, sellCount: 0, buyValue: 0, sellValue: 0 }, director: { buyCount: 0, sellCount: 0, buyValue: 0, sellValue: 0 }, tenPercentOwner: { buyCount: 0, sellCount: 0, buyValue: 0, sellValue: 0 } },
    executiveActivity: { ceoTransactions: [], cfoTransactions: [], hasCeoActivity: false, hasCfoActivity: false },
    ownershipTrend: { trend: "STABLE", netOwnershipChange: 0, perOwnerChanges: [] },
    transactionSize: { overallSignificance: "NONE", largestTransaction: null, totalDollarVolume: 0 },
    bullishFactors: [],
    bearishFactors: [],
    risks: [],
    confidence: { confidence: 0, components: { base: 0, sampleBonus: 0, filingsBonus: 0, clusterBonus: 0, recencyBonus: 0 } },
    verifiedOpenMarketPurchases: summarizeVerifiedPurchases([]),
    signalEligible: false,
    dataQuality: { source: "SEC EDGAR Form 4", available: false, reason, filingsFetched: 0, verifiedPurchaseCount: 0 },
    inputs,
  };
  report.aiSummary = generateAiSummary(report);
  return report;
}

/**
 * Generates the full normalized Insider Trading Intelligence report for
 * one symbol. `provider` defaults to the real, SEC-EDGAR-backed
 * implementation, but accepts any object implementing the documented
 * `getSymbolInsiderData(symbol)` interface.
 */
async function generateReport(symbol, { provider = defaultProvider } = {}) {
  const metrics = await provider.getSymbolInsiderData(symbol);

  if (!metrics.dataAvailable) {
    return buildUnavailableReport(symbol, metrics.asOf, metrics.unavailableReason, metrics);
  }

  const { transactions } = metrics;

  const netInsiderActivity = analyzeNetInsiderActivity(transactions);
  const officerDirectorActivity = analyzeOfficerDirectorActivity(transactions);
  const executiveActivity = analyzeExecutiveActivity(transactions);
  const clusterActivity = analyzeClusterActivity(transactions);
  const transactionSize = analyzeTransactionSize(transactions);
  const ownershipTrend = analyzeOwnershipTrend(transactions);

  const mostRecentFilingDate = transactions.reduce((latest, t) => (!latest || t.filingDate > latest ? t.filingDate : latest), null);

  const confidence = computeConfidence({
    dataAvailable: true,
    filingsFetched: metrics.filingsFetched,
    transactionCount: transactions.length,
    hasCluster: clusterActivity.clusterBuy || clusterActivity.clusterSell,
    mostRecentFilingDate,
  });

  const bullishFactors = buildBullishFactors({ netInsiderActivity, clusterActivity, executiveActivity, transactionSize });
  const bearishFactors = buildBearishFactors({ netInsiderActivity, clusterActivity, executiveActivity, transactionSize });
  const risks = buildRisks({ transactionCount: transactions.length, filingsFetched: metrics.filingsFetched, ownershipTrend });
  const verifiedOpenMarketPurchases = summarizeVerifiedPurchases(transactions, { now: new Date(metrics.asOf) });
  const signalEligible = verifiedOpenMarketPurchases.count > 0 && verifiedOpenMarketPurchases.actionableFreshness;

  const report = {
    symbol: metrics.symbol,
    generatedAt: metrics.asOf,
    dataAvailable: true,
    unavailableReason: null,
    insiderActivity: netInsiderActivity.insiderActivity,
    netInsiderScore: netInsiderActivity.netInsiderScore,
    clusterActivity,
    officerDirectorActivity,
    executiveActivity,
    ownershipTrend,
    transactionSize,
    bullishFactors,
    bearishFactors,
    risks,
    confidence,
    verifiedOpenMarketPurchases,
    signalEligible,
    dataQuality: {
      source: "SEC EDGAR Form 4",
      available: true,
      cik: metrics.cik,
      filingsFetched: metrics.filingsFetched,
      transactionsParsed: transactions.length,
      verifiedPurchaseCount: verifiedOpenMarketPurchases.count,
      latestVerifiedPurchaseDate: verifiedOpenMarketPurchases.latestDate,
      ageDays: verifiedOpenMarketPurchases.ageDays,
      actionableFreshness: verifiedOpenMarketPurchases.actionableFreshness,
      verificationRule: verifiedOpenMarketPurchases.verificationRule,
    },
    // Retained for auditability/debugging — every number above traces
    // back to these real, already-fetched inputs.
    inputs: metrics,
  };
  report.aiSummary = generateAiSummary(report);
  return report;
}

module.exports = { generateReport, createInsiderDataProvider };
