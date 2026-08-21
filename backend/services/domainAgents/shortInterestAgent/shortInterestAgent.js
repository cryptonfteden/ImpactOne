// Phase SHORT-INTEREST-AGENT-001 — "Build the Short Interest
// Intelligence Agent." This module is the reusable analysis engine,
// composing every piece this mission requires (Short Interest Bias,
// Short Interest Score, Squeeze Probability, Borrow Stress, Covering
// Activity, Crowdedness Score, Risks, Opportunities, Confidence, AI
// Summary) from FINRA's real daily short-volume data — never
// fabricating short-interest data.
// backend/services/agentOrchestrator/agents/shortInterestAgent.js is
// the thin adapter wiring it into the generic Agent interface — the
// same engine-vs-adapter split every domain agent this session uses.
const { createFinraShortVolumeDataProvider, DEFAULT_LOOKBACK_TRADING_DAYS } = require("./finraShortVolumeDataProvider");
const priceHistoryProvider = require("../../intelligence/priceHistoryProvider");
const { analyzeShortInterestTrend } = require("./shortInterestTrendAnalyzer");
const { analyzeCoveringActivity } = require("./coveringActivityAnalyzer");
const { analyzeCrowdedness } = require("./crowdednessAnalyzer");
const { analyzeSqueezeProbability } = require("./squeezeProbabilityAnalyzer");
const { analyzeBorrowStress } = require("./borrowStressAnalyzer");
const { analyzeShortInterestScore } = require("./shortInterestScoreAnalyzer");
const { computeConfidence } = require("./confidenceModel");
const { buildOpportunities, buildRisks } = require("./risksOpportunitiesBuilder");
const { generateAiSummary } = require("./aiSummary");

const defaultProvider = createFinraShortVolumeDataProvider();

function assessDataQuality(metrics, lookbackTradingDays = DEFAULT_LOOKBACK_TRADING_DAYS) {
  const rows = metrics?.dailyShortVolume || [];
  const latestDate = rows.at(-1)?.date || null;
  const parsedLatest = latestDate ? Date.parse(`${latestDate.slice(0, 4)}-${latestDate.slice(4, 6)}-${latestDate.slice(6, 8)}T00:00:00Z`) : NaN;
  const ageDays = Number.isFinite(parsedLatest) ? Math.floor((Date.now() - parsedLatest) / 86400000) : null;
  const blockers = [
    ...(rows.length < Math.min(5, lookbackTradingDays) ? [`Only ${rows.length} FINRA session(s) were verified.`] : []),
    ...(ageDays == null ? ["Latest FINRA session date is unknown."] : ageDays > 7 ? [`Latest FINRA session is ${ageDays} days old.`] : []),
  ];
  return {
    source: "FINRA Reg SHO daily short-volume files",
    metricDefinition: "short-selling trade volume, not open short interest and not trader count",
    sessionCount: rows.length,
    requestedSessionCount: lookbackTradingDays,
    latestSessionDate: latestDate,
    ageDays,
    blockers,
    signalEligible: Boolean(metrics?.dataAvailable) && blockers.length === 0,
  };
}

function buildUnavailableReport(symbol, asOf, reason, inputs) {
  const dataQuality = assessDataQuality(inputs);
  const borrowStress = analyzeBorrowStress();
  const report = {
    symbol,
    generatedAt: asOf,
    dataAvailable: false,
    signalEligible: false,
    dataQuality,
    unavailableReason: reason,
    shortInterestBias: "NEUTRAL",
    shortInterestScore: 0,
    shortInterestTrend: { trend: "UNKNOWN", priorAvgRatio: null, recentAvgRatio: null, delta: null },
    squeezeProbability: 0,
    borrowStress,
    coveringActivity: { classification: "UNKNOWN", decliningDayRatio: null, decliningDays: 0, totalComparableDays: 0 },
    crowdednessScore: 0,
    risks: [],
    opportunities: [],
    confidence: { confidence: 0, components: { base: 0, sampleBonus: 0, trendBonus: 0, priceDataBonus: 0, structuralPenalty: 0 } },
    inputs,
  };
  report.aiSummary = generateAiSummary(report);
  return report;
}

async function fetchRecentPriceChangePercent(symbol, lookbackTradingDays) {
  try {
    const bars = await priceHistoryProvider.getDailyBars(symbol, { range: "1mo" });
    const recentBars = bars.slice(-lookbackTradingDays);
    if (recentBars.length < 2) return null;
    const first = recentBars[0].close;
    const last = recentBars[recentBars.length - 1].close;
    if (!Number.isFinite(first) || !Number.isFinite(last) || first === 0) return null;
    return Math.round(((last - first) / first) * 100 * 100) / 100;
  } catch {
    return null;
  }
}

/**
 * Generates the full normalized Short Interest Intelligence report for
 * one symbol. `provider` defaults to the real, FINRA-backed
 * implementation, but accepts any object implementing the documented
 * `getSymbolShortVolumeData(symbol)` interface.
 */
async function generateReport(symbol, { provider = defaultProvider, lookbackTradingDays = DEFAULT_LOOKBACK_TRADING_DAYS } = {}) {
  const metrics = await provider.getSymbolShortVolumeData(symbol);

  if (!metrics.dataAvailable) {
    return buildUnavailableReport(symbol, metrics.asOf, metrics.unavailableReason, metrics);
  }

  const { dailyShortVolume } = metrics;

  const shortInterestTrend = analyzeShortInterestTrend(dailyShortVolume);
  const coveringActivity = analyzeCoveringActivity(dailyShortVolume);
  const { crowdednessScore } = analyzeCrowdedness(dailyShortVolume);
  const priceChangePercent = await fetchRecentPriceChangePercent(symbol, lookbackTradingDays);
  const { squeezeProbability, priceDataUsed } = analyzeSqueezeProbability(crowdednessScore, priceChangePercent);
  const borrowStress = analyzeBorrowStress();
  const { shortInterestBias, shortInterestScore } = analyzeShortInterestScore(shortInterestTrend);

  const confidence = computeConfidence({
    dataAvailable: true,
    daysCount: dailyShortVolume.length,
    trendKnown: shortInterestTrend.trend !== "UNKNOWN",
    priceDataUsed,
  });
  const dataQuality = assessDataQuality(metrics, lookbackTradingDays);

  const opportunities = buildOpportunities({ shortInterestBias, shortInterestScore, squeezeProbability, coveringActivity, crowdednessScore });
  const risks = buildRisks({ shortInterestBias, borrowStress, daysCount: dailyShortVolume.length, lookbackTradingDays });

  const report = {
    symbol: metrics.symbol,
    generatedAt: metrics.asOf,
    dataAvailable: true,
    signalEligible: dataQuality.signalEligible,
    dataQuality,
    unavailableReason: null,
    shortInterestBias,
    shortInterestScore,
    shortInterestTrend,
    squeezeProbability,
    borrowStress,
    coveringActivity,
    crowdednessScore,
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

module.exports = { generateReport, createFinraShortVolumeDataProvider, assessDataQuality };
