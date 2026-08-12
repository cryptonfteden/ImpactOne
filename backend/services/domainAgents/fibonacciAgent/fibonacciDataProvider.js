// Phase FIBONACCI-AGENT-001 — the provider abstraction the mission
// requires. Reuses the same already-real, already-tested subsystems
// TECHNICAL-AGENT-001 established: priceHistoryProvider.js (real daily
// bars, no auth) and technicalIntelligenceService.js (Sprint 37's
// honest, evidence-not-verdict trend signal) — computed once from the
// same real bars, then aggregated into real weekly bars for the
// "multiple timeframe agreement" objective. No duplicate network call.
//
// ## The interface
// A conforming provider is any object exposing:
//   async getSymbolFibonacciData(symbol) -> FibonacciMetrics
//
// `FibonacciMetrics` shape (every field always present; a field that
// cannot really be computed is `null`, NEVER fabricated):
//   symbol, asOf, dataAvailable, unavailableReason
//   barsUsed          number
//   enoughDataStatus  "SUFFICIENT"|"INSUFFICIENT"
//   freshness         { lastBarDate, ageDays } | null
//   currentPrice      number|null — the real last close
//   dailyBars         real bars, oldest-first (trimmed to the fetch range)
//   weeklyBars        real ISO-week-aggregated bars, oldest-first
//   dailyTrendSignal  the real "trend" signal from analyzeBars(dailyBars)
//   weeklyTrendSignal the real "trend" signal from analyzeBars(weeklyBars),
//                     or null when too few weekly bars exist
const priceHistoryProvider = require("../../intelligence/priceHistoryProvider");
const technicalIntelligenceService = require("../../intelligence/technicalIntelligenceService");
const { aggregateToWeeklyBars } = require("./weeklyBarAggregator");
const { aggregateToMonthlyBars } = require("./monthlyBarAggregator");

const MIN_BARS_FOR_ANALYSIS = 20;

function emptyMetrics(symbol, reason) {
  return {
    symbol,
    asOf: new Date().toISOString(),
    dataAvailable: false,
    unavailableReason: reason,
    barsUsed: 0,
    enoughDataStatus: "INSUFFICIENT",
    freshness: null,
    currentPrice: null,
    dailyBars: [],
    weeklyBars: [],
    monthlyBars: [],
    dailyTrendSignal: null,
    weeklyTrendSignal: null,
  };
}

function createFibonacciDataProvider({ range = "2y", timeframe = "1D" } = {}) {
  async function getSymbolFibonacciData(symbol) {
    const dailyBars = await priceHistoryProvider.getDailyBars(symbol, { range });
    if (dailyBars.length < MIN_BARS_FOR_ANALYSIS) {
      return emptyMetrics(symbol, `Fewer than ${MIN_BARS_FOR_ANALYSIS} real daily bars available for this symbol right now.`);
    }

    const dailyAnalysis = technicalIntelligenceService.analyzeBars(dailyBars, { timeframe });
    const weeklyBars = aggregateToWeeklyBars(dailyBars);
    const monthlyBars = aggregateToMonthlyBars(dailyBars);
    const weeklyAnalysis = weeklyBars.length >= MIN_BARS_FOR_ANALYSIS ? technicalIntelligenceService.analyzeBars(weeklyBars, { timeframe: "1W" }) : null;

    const lastBar = dailyBars[dailyBars.length - 1];

    return {
      symbol,
      asOf: new Date().toISOString(),
      dataAvailable: true,
      unavailableReason: null,
      barsUsed: dailyBars.length,
      enoughDataStatus: dailyAnalysis.enoughDataStatus,
      freshness: dailyAnalysis.freshness,
      currentPrice: Number.isFinite(lastBar?.close) ? lastBar.close : null,
      dailyBars,
      weeklyBars,
      monthlyBars,
      dailyTrendSignal: dailyAnalysis.signals?.trend || null,
      weeklyTrendSignal: weeklyAnalysis?.signals?.trend || null,
    };
  }

  return { getSymbolFibonacciData };
}

module.exports = { createFibonacciDataProvider, emptyMetrics, MIN_BARS_FOR_ANALYSIS };
