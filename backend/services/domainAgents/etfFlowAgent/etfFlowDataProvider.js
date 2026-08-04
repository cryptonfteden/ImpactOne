// Phase ETF-FLOW-AGENT-001 — the top-level provider abstraction. No
// licensed ETF creation/redemption flow feed is connected in this
// environment (confirmed by a dedicated research pass), so this
// provider is explicit and disclosed about what it really does:
// resolves a real target ETF (either the symbol itself, if it's a
// recognized ETF, or — for a stock symbol — its real sector's
// representative sector ETF, via a real Finnhub `finnhubIndustry`
// lookup + the existing sectorEtfMap.js), then fetches that ETF's real
// daily price/volume bars (the existing, unmodified priceHistoryProvider.js)
// for the flow-PROXY analysis every downstream module computes. This
// is a real, disclosed trading-activity proxy, never a claim of true
// creation/redemption dollar flows.
//
// ## The interface
// A conforming provider is any object exposing:
//   async getSymbolEtfFlowData(symbol) -> EtfFlowMetrics
//
// `EtfFlowMetrics` shape (every field always present; a field that
// cannot really be resolved is `null`/`false`, NEVER fabricated):
//   symbol, asOf, dataAvailable, unavailableReason
//   targetEtf              string|null — the real ETF ticker analyzed
//   isDirectEtf             boolean — true if `symbol` itself is the analyzed ETF
//   sector                  string|null
//   theme                   string|null
//   passiveActiveClassification "PASSIVE"|"ACTIVE"|null
//   etfBars                 real daily bars for `targetEtf`
//   marketBars              real daily bars for SPY (sector-rotation reference), [] if unavailable or targetEtf is itself SPY
const priceHistoryProvider = require("../../intelligence/priceHistoryProvider");
const stockSectorResolver = require("./stockSectorResolver");
const { isRecognizedEtf, getTheme, getPassiveActiveClassification, getSectorEtf, getSectorNameForEtf } = require("./etfClassificationReference");

const DEFAULT_RANGE = "6mo";
const MARKET_REFERENCE_ETF = "SPY";

function emptyMetrics(symbol, reason) {
  return {
    symbol,
    asOf: new Date().toISOString(),
    dataAvailable: false,
    unavailableReason: reason,
    targetEtf: null,
    isDirectEtf: false,
    sector: null,
    theme: null,
    passiveActiveClassification: null,
    etfBars: [],
    marketBars: [],
  };
}

function createEtfFlowDataProvider({ range = DEFAULT_RANGE } = {}) {
  async function resolveTarget(symbol) {
    const upper = symbol.toUpperCase();
    if (isRecognizedEtf(upper)) {
      return {
        targetEtf: upper,
        isDirectEtf: true,
        sector: getSectorNameForEtf(upper),
        theme: getTheme(upper),
        passiveActiveClassification: getPassiveActiveClassification(upper),
        unavailableReason: null,
      };
    }

    const sectorResult = await stockSectorResolver.resolveStockSector(symbol);
    if (!sectorResult.dataAvailable) {
      return { targetEtf: null, isDirectEtf: false, sector: null, theme: null, passiveActiveClassification: null, unavailableReason: sectorResult.unavailableReason };
    }

    const sectorEtf = getSectorEtf(sectorResult.sector);
    if (!sectorEtf) {
      return { targetEtf: null, isDirectEtf: false, sector: sectorResult.sector, theme: null, passiveActiveClassification: null, unavailableReason: `No recognized sector ETF mapping exists for sector "${sectorResult.sector}".` };
    }

    return {
      targetEtf: sectorEtf,
      isDirectEtf: false,
      sector: sectorResult.sector,
      theme: null,
      passiveActiveClassification: getPassiveActiveClassification(sectorEtf),
      unavailableReason: null,
    };
  }

  async function getSymbolEtfFlowData(symbol) {
    const target = await resolveTarget(symbol);
    if (!target.targetEtf) {
      return emptyMetrics(symbol, target.unavailableReason || `Could not resolve a real ETF for "${symbol}".`);
    }

    const etfBars = await priceHistoryProvider.getDailyBars(target.targetEtf, { range });
    if (!etfBars.length) {
      return emptyMetrics(symbol, `No real price history available for "${target.targetEtf}".`);
    }

    const marketBars = target.targetEtf === MARKET_REFERENCE_ETF ? [] : await priceHistoryProvider.getDailyBars(MARKET_REFERENCE_ETF, { range });

    return {
      symbol,
      asOf: new Date().toISOString(),
      dataAvailable: true,
      unavailableReason: null,
      targetEtf: target.targetEtf,
      isDirectEtf: target.isDirectEtf,
      sector: target.sector,
      theme: target.theme,
      passiveActiveClassification: target.passiveActiveClassification,
      etfBars,
      marketBars,
    };
  }

  return { getSymbolEtfFlowData };
}

module.exports = { createEtfFlowDataProvider, emptyMetrics, MARKET_REFERENCE_ETF };
