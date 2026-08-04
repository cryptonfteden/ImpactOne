// Phase TECHNICAL-AGENT-001 — the provider abstraction the mission
// requires. Reuses two already-real, already-tested subsystems rather
// than rebuilding indicator math: technicalIntelligenceService.js
// (Sprint 37's honest, evidence-not-verdict signal layer — trend,
// moving averages, RSI, MACD, ATR, VWAP, Bollinger, Fibonacci,
// support/resistance, breakout, volatility regime) and the two new
// pure indicators this phase added to technicalIndicators.js (ADX,
// volume trend). Both are computed from the exact same real daily bars
// fetched once — no duplicate network/data call.
//
// ## The interface
// A conforming provider is any object exposing:
//   async getSymbolTechnicals(symbol) -> TechnicalMetrics
//
// `TechnicalMetrics` shape (every field always present; a field that
// cannot really be computed is `null`, NEVER fabricated):
//   symbol, asOf, dataAvailable, unavailableReason
//   barsUsed            number
//   enoughDataStatus    "SUFFICIENT"|"INSUFFICIENT"
//   freshness           { lastBarDate, ageDays } | null
//   signals             the full, real signals object from
//                        technicalIntelligenceService.analyzeBars() —
//                        trend, movingAverages, rsi, macd, atr, vwap,
//                        bollingerBands, fibonacciRetracement,
//                        supportResistance, breakout, volatilityRegime
//   adx                 number|null — Wilder's Average Directional Index
//   volumeTrend         { recentAvgVolume, priorAvgVolume, percentChange }|null
//   supportResistanceDetail  { support, resistance, recentPivotHighs, recentPivotLows }|null —
//                        the full detectSupportResistance() output,
//                        richer than technicalIntelligenceService's own
//                        surfaced support/resistance signal (which only
//                        exposes the single extremes, not the pivots)
const priceHistoryProvider = require("../../intelligence/priceHistoryProvider");
const technicalIntelligenceService = require("../../intelligence/technicalIntelligenceService");
const indicators = require("../../intelligence/technicalIndicators");

const ADX_PERIOD = 14;

function emptyMetrics(symbol, reason) {
  return {
    symbol,
    asOf: new Date().toISOString(),
    dataAvailable: false,
    unavailableReason: reason,
    barsUsed: 0,
    enoughDataStatus: "INSUFFICIENT",
    freshness: null,
    signals: {},
    adx: null,
    volumeTrend: null,
    supportResistanceDetail: null,
  };
}

function createTechnicalDataProvider({ range = "1y", timeframe = "1D" } = {}) {
  async function getSymbolTechnicals(symbol) {
    const bars = await priceHistoryProvider.getDailyBars(symbol, { range });
    if (!bars.length) {
      return emptyMetrics(symbol, "No price history available for this symbol right now.");
    }

    const analysis = technicalIntelligenceService.analyzeBars(bars, { timeframe });
    const adx = indicators.averageDirectionalIndex(bars, ADX_PERIOD);
    const volumeTrend = indicators.volumeTrend(bars);
    const supportResistanceDetail = indicators.detectSupportResistance(bars, 60);

    return {
      symbol,
      asOf: new Date().toISOString(),
      dataAvailable: true,
      unavailableReason: null,
      barsUsed: analysis.barsUsed,
      enoughDataStatus: analysis.enoughDataStatus,
      freshness: analysis.freshness,
      signals: analysis.signals,
      adx,
      volumeTrend,
      supportResistanceDetail,
    };
  }

  return { getSymbolTechnicals };
}

module.exports = { createTechnicalDataProvider, emptyMetrics };
