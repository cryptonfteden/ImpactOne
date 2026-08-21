const { createFibonacciDataProvider } = require("./fibonacciDataProvider");
const { calculateRetracementLevels } = require("./retracementCalculator");
const { analyzeWeeklyBars } = require("./weeklyStrategyAnalyzer");
const { IMPACTONE_FIBONACCI_PROFILE } = require("./impactOneFibonacciProfile");
const { DEFAULT_DISPLAY_CONFIG } = require("./fibonacciDisplayConfig");

const defaultProvider = createFibonacciDataProvider();

function buildDataQuality(metrics, weeklyStrategy, now = new Date()) {
  const latest = weeklyStrategy?.latestWeek || metrics?.freshness?.lastBarDate || null;
  const ageDays = latest ? Math.max(0, Math.floor((new Date(now).getTime() - new Date(`${latest}T00:00:00Z`).getTime()) / 86400000)) : null;
  const stale = Number.isFinite(ageDays) ? ageDays > 14 : true;
  return {
    status: weeklyStrategy?.dataAvailable && !stale ? "VERIFIED" : weeklyStrategy?.dataAvailable ? "STALE" : "UNAVAILABLE",
    source: "ImpactOne verified OHLCV price-history provider",
    timeframe: "1W",
    candleState: "COMPLETED_ONLY",
    barsUsed: Number(weeklyStrategy?.weeklyBars || 0),
    latestCompletedWeek: latest,
    ageDays,
    stale,
    strategyVersion: IMPACTONE_FIBONACCI_PROFILE.strategyVersion,
  };
}

function weeklySummary(symbol, setup) {
  if (!setup?.dataAvailable) return `Weekly Fibonacci is unavailable for ${symbol}: ${setup?.reason || "verified weekly candles are unavailable"}`;
  const distance = Math.abs(Number(setup.distancePct)).toFixed(2);
  const point = Number(setup.targetPrice).toFixed(2);
  const anchors = `weekly low ${setup.swing.swingLow.toFixed(2)} (${setup.swing.swingLowDate}) followed by weekly high ${setup.swing.swingHigh.toFixed(2)} (${setup.swing.swingHighDate})`;
  if (setup.signalEligible) return `${symbol} is ${distance}% above the weekly 0.886 point at ${point}. The setup uses ${anchors}; the committee must still validate the evidence before any simulated entry.`;
  if (setup.distancePct < 0) return `${symbol} is already ${distance}% below the weekly 0.886 point at ${point}. It is not a new ImpactOne entry alert.`;
  return `${symbol} is ${distance}% above the weekly 0.886 point at ${point}, outside the 5% entry-alert zone. The setup uses ${anchors}.`;
}

function unavailableReport(symbol, metrics, weeklyStrategy, now = new Date()) {
  const reason = weeklyStrategy?.reason || metrics?.unavailableReason || "Verified weekly data is unavailable.";
  return {
    symbol,
    generatedAt: metrics?.asOf || new Date().toISOString(),
    dataAvailable: false,
    unavailableReason: reason,
    signalEligible: false,
    strategy: { ...IMPACTONE_FIBONACCI_PROFILE },
    weeklyStrategy,
    dataQuality: buildDataQuality(metrics, weeklyStrategy, now),
    trendContext: "NEUTRAL",
    primarySwing: null,
    retracementLevels: null,
    weeklyScanLevels: null,
    monthlyScanLevels: null,
    extensionTargets: null,
    confluenceZones: [],
    highProbabilityZones: [],
    entryZone: null,
    riskZone: null,
    timeframeAgreement: "WEEKLY_ONLY",
    confidence: { confidence: 0, components: { dataQuality: 0, swingQuality: 0, proximity: 0 } },
    displayConfig: DEFAULT_DISPLAY_CONFIG,
    inputs: metrics,
    aiSummary: `Weekly Fibonacci is unavailable for ${symbol}: ${reason}`,
  };
}

async function generateReport(symbol, { provider = defaultProvider, now = new Date() } = {}) {
  const metrics = await provider.getSymbolFibonacciData(symbol);
  if (!metrics?.dataAvailable) return unavailableReport(symbol, metrics, null, now);

  const weeklyStrategy = analyzeWeeklyBars(symbol, metrics.weeklyBars, { now });
  if (!weeklyStrategy.dataAvailable) return unavailableReport(symbol, metrics, weeklyStrategy, now);

  const retracementLevels = calculateRetracementLevels(weeklyStrategy.swing);
  const dataQuality = buildDataQuality(metrics, weeklyStrategy, now);
  const dataQualityScore = dataQuality.stale ? 55 : 95;
  const swingQualityScore = Math.min(100, Math.round(weeklyStrategy.swing.strengthPct * 2.5));
  const confidenceScore = Math.round(dataQualityScore * 0.55 + swingQualityScore * 0.25 + weeklyStrategy.technicalScore * 0.2);
  const entryZone = {
    label: weeklyStrategy.signalEligible ? "Weekly 0.886 entry zone" : "Weekly 0.886 watch point",
    centerPrice: weeklyStrategy.targetPrice,
    low: weeklyStrategy.targetPrice,
    high: weeklyStrategy.targetPrice * (1 + IMPACTONE_FIBONACCI_PROFILE.entryZone.maxDistancePct / 100),
    confluenceScore: weeklyStrategy.technicalScore,
  };

  return {
    symbol: metrics.symbol || symbol,
    generatedAt: metrics.asOf || new Date().toISOString(),
    dataAvailable: true,
    unavailableReason: null,
    signalEligible: weeklyStrategy.signalEligible,
    alertStatus: weeklyStrategy.signalEligible ? "WEEKLY_ENTRY_ALERT" : "NO_WEEKLY_ENTRY_ALERT",
    strategy: { ...IMPACTONE_FIBONACCI_PROFILE },
    weeklyStrategy,
    dataQuality,
    trendContext: weeklyStrategy.signalEligible ? "BULLISH" : "NEUTRAL",
    primarySwing: weeklyStrategy.swing,
    retracementLevels,
    weeklyScanLevels: retracementLevels,
    monthlyScanLevels: null,
    extensionTargets: null,
    confluenceZones: [],
    highProbabilityZones: [],
    entryZone,
    riskZone: null,
    timeframeAgreement: "WEEKLY_ONLY",
    confidence: {
      confidence: confidenceScore,
      components: { dataQuality: dataQualityScore, swingQuality: swingQualityScore, proximity: weeklyStrategy.technicalScore },
    },
    displayConfig: DEFAULT_DISPLAY_CONFIG,
    inputs: metrics,
    aiSummary: weeklySummary(symbol, weeklyStrategy),
  };
}

module.exports = { generateReport, createFibonacciDataProvider, buildDataQuality, weeklySummary };
