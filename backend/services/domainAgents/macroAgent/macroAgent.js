// Phase MACRO-AGENT-001 — "Build the Macro Intelligence Agent." This
// module is the reusable analysis engine, composing every piece this
// mission requires (Macro Bias, Macro Score, Economic Cycle, Liquidity
// Score, Inflation Pressure, Recession Risk, Policy Direction, Market
// Stress, Confidence, Bullish/Bearish Factors, Risks, AI Summary) from
// real macroeconomic data (FRED + real market proxies) — never
// fabricating macro values, honestly reporting unavailable fields
// where no real source exists. Market-wide (not per-symbol), matching
// this mission's own scope.
const { createMacroDataProvider } = require("./macroDataProvider");
const { analyzeInflationPressure } = require("./inflationAnalyzer");
const { analyzeEmployment } = require("./employmentAnalyzer");
const { analyzeYieldCurve } = require("./yieldCurveAnalyzer");
const { analyzeCreditSpread } = require("./creditSpreadAnalyzer");
const { analyzePolicyDirection } = require("./policyDirectionAnalyzer");
const { analyzeLiquidity } = require("./liquidityAnalyzer");
const { analyzeMarketStress } = require("./marketStressAnalyzer");
const { analyzeEconomicCycle } = require("./economicCycleAnalyzer");
const { analyzeRecessionRisk } = require("./recessionRiskAnalyzer");
const { analyzeMacroScore } = require("./macroScoreAnalyzer");
const { computeConfidence } = require("./confidenceModel");
const { buildBullishFactors, buildBearishFactors, buildRisks } = require("./factorsRisksBuilder");
const { generateAiSummary } = require("./aiSummary");

const defaultProvider = createMacroDataProvider();
const CRITICAL_MACRO_KEYS = ["interestRates", "inflation", "employment", "yieldCurve", "creditSpread", "liquidity"];

function ageDays(dateValue, asOf) {
  const timestamp = Date.parse(dateValue);
  const reference = Date.parse(asOf);
  if (!Number.isFinite(timestamp) || !Number.isFinite(reference)) return null;
  return Math.max(0, Math.floor((reference - timestamp) / 86400000));
}

function assessDataQuality(metrics, confidenceResult) {
  const sources = [...CRITICAL_MACRO_KEYS, "gdp", "vix", "oil", "gold", "usdStrength"].map((key) => {
    const item = metrics[key] || {};
    const latestDate = item.latest?.date || item.latestDate || null;
    return { key, available: Boolean(item.dataAvailable), latestDate, ageDays: ageDays(latestDate, metrics.asOf) };
  });
  const criticalAvailable = sources.filter((source) => CRITICAL_MACRO_KEYS.includes(source.key) && source.available).length;
  const staleCritical = sources.filter((source) => CRITICAL_MACRO_KEYS.includes(source.key) && source.available && source.ageDays !== null && source.ageDays > 180);
  const signalEligible = confidenceResult.confidence >= 70 && criticalAvailable >= 5 && staleCritical.length === 0;
  return {
    sources,
    availableSourceCount: confidenceResult.availableSourceCount,
    totalSourceCount: confidenceResult.totalSourceCount,
    criticalAvailable,
    staleCritical: staleCritical.map((source) => source.key),
    signalEligible,
    blockers: [
      ...(confidenceResult.confidence < 70 ? [`Macro source confidence is only ${confidenceResult.confidence}/100.`] : []),
      ...(criticalAvailable < 5 ? [`Only ${criticalAvailable}/6 critical macro series are available.`] : []),
      ...(staleCritical.length ? [`Stale critical series: ${staleCritical.map((source) => source.key).join(", ")}.`] : []),
    ],
  };
}

function buildContrarianWatch({ macroBias, marketStress, recessionRisk, vix }) {
  const vixLevel = Number(vix?.latestClose);
  if (macroBias === "BEARISH" && (marketStress === "HIGH" || vixLevel >= 30)) {
    return { active: true, type: "PANIC_REVERSAL_WATCH", meaning: "Fear is extreme. Do not chase the crowd; wait for verified price confirmation before considering a reversal." };
  }
  if (macroBias === "BULLISH" && marketStress === "LOW" && Number.isFinite(vixLevel) && vixLevel <= 13) {
    return { active: true, type: "COMPLACENCY_RISK_WATCH", meaning: "Confidence is unusually high. Tighten evidence requirements instead of assuming the trend must continue." };
  }
  return { active: false, type: null, meaning: "No extreme crowd condition is verified." };
}

function buildUnavailableReport(asOf, reason, inputs) {
  const report = {
    generatedAt: asOf,
    dataAvailable: false,
    unavailableReason: reason,
    macroBias: "UNKNOWN",
    macroScore: null,
    economicCycle: "UNKNOWN",
    liquidityScore: null,
    inflationPressure: "UNKNOWN",
    recessionRisk: "UNKNOWN",
    policyDirection: "UNKNOWN",
    marketStress: "UNKNOWN",
    employmentTrend: "UNKNOWN",
    confidence: 0,
    bullishFactors: [],
    bearishFactors: [],
    risks: [],
    signalEligible: false,
    dataQuality: { signalEligible: false, blockers: [reason] },
    contrarianWatch: { active: false, type: null, meaning: "No reliable macro picture is available." },
    inputs,
  };
  report.aiSummary = generateAiSummary(report);
  return report;
}

/**
 * Generates the full normalized Macro Intelligence report. `provider`
 * defaults to the real, already-tested FRED/Yahoo-backed
 * implementation, but accepts any object implementing the documented
 * `getMacroData()` interface.
 */
async function generateReport({ provider = defaultProvider } = {}) {
  const metrics = await provider.getMacroData();

  if (!metrics.dataAvailable) {
    return buildUnavailableReport(metrics.asOf, metrics.unavailableReason, metrics);
  }

  const inflationResult = analyzeInflationPressure(metrics.inflation);
  const employmentResult = analyzeEmployment(metrics.employment);
  const yieldCurveResult = analyzeYieldCurve(metrics.yieldCurve);
  const creditSpreadResult = analyzeCreditSpread(metrics.creditSpread);
  const policyDirectionResult = analyzePolicyDirection(metrics.interestRates);
  const liquidityResult = analyzeLiquidity(metrics.liquidity);
  const marketStressResult = analyzeMarketStress(metrics.vix, creditSpreadResult);
  const economicCycleResult = analyzeEconomicCycle(metrics.gdp, employmentResult, yieldCurveResult);
  const recessionRiskResult = analyzeRecessionRisk(yieldCurveResult, creditSpreadResult, employmentResult);
  const { macroBias, macroScore } = analyzeMacroScore(
    yieldCurveResult,
    marketStressResult,
    policyDirectionResult,
    inflationResult,
    employmentResult,
    liquidityResult
  );

  const fredSeriesMap = {
    interestRates: metrics.interestRates,
    inflation: metrics.inflation,
    employment: metrics.employment,
    gdp: metrics.gdp,
    yieldCurve: metrics.yieldCurve,
    creditSpread: metrics.creditSpread,
    liquidity: metrics.liquidity,
  };
  const marketProxyMap = {
    vix: metrics.vix,
    oil: metrics.oil,
    gold: metrics.gold,
    usdStrength: metrics.usdStrength,
  };
  const confidenceResult = computeConfidence(fredSeriesMap, marketProxyMap);
  const dataQuality = assessDataQuality(metrics, confidenceResult);
  const contrarianWatch = buildContrarianWatch({ macroBias, marketStress: marketStressResult.marketStress, recessionRisk: recessionRiskResult.recessionRisk, vix: metrics.vix });

  const bullishFactors = buildBullishFactors({ yieldCurveResult, marketStressResult, policyDirectionResult, inflationResult, employmentResult, liquidityResult });
  const bearishFactors = buildBearishFactors({ yieldCurveResult, marketStressResult, policyDirectionResult, inflationResult, employmentResult, liquidityResult });
  const risks = buildRisks({ creditSpreadResult, recessionRiskResult, economicCycleResult, confidence: confidenceResult });

  const report = {
    generatedAt: metrics.asOf,
    dataAvailable: true,
    unavailableReason: null,
    macroBias,
    macroScore,
    economicCycle: economicCycleResult.cycle,
    liquidityScore: liquidityResult.liquidityScore,
    inflationPressure: inflationResult.classification,
    recessionRisk: recessionRiskResult.recessionRisk,
    policyDirection: policyDirectionResult.direction,
    marketStress: marketStressResult.marketStress,
    employmentTrend: employmentResult.trend,
    confidence: confidenceResult.confidence,
    signalEligible: dataQuality.signalEligible,
    dataQuality,
    contrarianWatch,
    bullishFactors,
    bearishFactors,
    risks,
    // Retained for auditability/debugging — every field above traces
    // back to these real, already-fetched inputs and intermediate
    // per-signal analyzer results.
    inputs: metrics,
    details: {
      inflation: inflationResult,
      employment: employmentResult,
      yieldCurve: yieldCurveResult,
      creditSpread: creditSpreadResult,
      policyDirection: policyDirectionResult,
      liquidity: liquidityResult,
      marketStress: marketStressResult,
      economicCycle: economicCycleResult,
      recessionRisk: recessionRiskResult,
      confidence: confidenceResult,
    },
  };
  report.aiSummary = generateAiSummary(report);
  return report;
}

module.exports = { generateReport, createMacroDataProvider, assessDataQuality, buildContrarianWatch };
