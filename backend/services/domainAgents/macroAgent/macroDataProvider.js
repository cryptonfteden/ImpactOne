// Phase MACRO-AGENT-001 — the top-level provider abstraction the
// mission requires. Fetches every real data source this agent's 12
// objectives need, in parallel, each independently degrading honestly
// — one real series/proxy failing never blocks the others. Overall
// `dataAvailable` is true as long as at least one real source came
// back, so a partial real macro picture is still reported (with each
// individual field's own honest availability), never collapsed into
// one all-or-nothing failure.
//
// ## The interface
// A conforming provider is any object exposing:
//   async getMacroData() -> MacroMetrics
//
// `MacroMetrics` shape — every field is a real FRED series read
// (fredSeriesProvider.js) or real market-proxy read
// (marketProxyProvider.js), each independently `dataAvailable`:
//   asOf, dataAvailable, unavailableReason
//   interestRates (FEDFUNDS), inflation (CPIAUCSL), employment (UNRATE),
//   gdp (GDPC1), yieldCurve (T10Y2Y), creditSpread (BAMLH0A0HYM2),
//   liquidity (M2SL), vix, oil, gold, usdStrength
const fredSeriesProvider = require("./fredSeriesProvider");
const marketProxyProvider = require("./marketProxyProvider");

const FRED_SERIES = {
  interestRates: "FEDFUNDS",
  inflation: "CPIAUCSL",
  employment: "UNRATE",
  gdp: "GDPC1",
  yieldCurve: "T10Y2Y",
  creditSpread: "BAMLH0A0HYM2",
  liquidity: "M2SL",
};

const MARKET_PROXIES = {
  vix: "^VIX",
  oil: "CL=F",
  gold: "GC=F",
  usdStrength: "DX-Y.NYB",
};

function createMacroDataProvider() {
  async function getMacroData() {
    const fredEntries = Object.entries(FRED_SERIES);
    const proxyEntries = Object.entries(MARKET_PROXIES);

    const [fredResults, proxyResults] = await Promise.all([
      Promise.all(fredEntries.map(([, seriesId]) => fredSeriesProvider.fetchFredSeries(seriesId))),
      Promise.all(proxyEntries.map(([, symbol]) => marketProxyProvider.fetchMarketProxy(symbol))),
    ]);

    const metrics = { asOf: new Date().toISOString() };
    fredEntries.forEach(([key], index) => {
      metrics[key] = fredResults[index];
    });
    proxyEntries.forEach(([key], index) => {
      metrics[key] = proxyResults[index];
    });

    const anyAvailable = [...fredResults, ...proxyResults].some((result) => result.dataAvailable);
    metrics.dataAvailable = anyAvailable;
    metrics.unavailableReason = anyAvailable ? null : "No real macroeconomic data source (FRED or the real market-index proxies) could be reached.";

    return metrics;
  }

  return { getMacroData };
}

module.exports = { createMacroDataProvider, FRED_SERIES, MARKET_PROXIES };
