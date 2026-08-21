// Phase VALUATION-AGENT-001 — the provider abstraction the mission
// requires, implementing VALUATION_RESEARCH.md's recommendation to
// "audit and fully utilize the response finnhubService.js is already
// calling" rather than adding a new vendor for an MVP. Anything
// downstream (negativeEarningsHandler, impliedPriceCalculator,
// confidenceModel, the agent itself) depends only on the shape
// documented below, never on where the numbers came from.
//
// ## The interface
// A conforming provider is any object exposing:
//   async getSymbolValuation(symbol) -> ValuationMetrics
//
// `ValuationMetrics` shape (every field always present; a field that
// cannot really be extracted is `null`, NEVER fabricated):
//   symbol, asOf, dataAvailable, unavailableReason
//   price               number|null — current share price
//   industry            string|null — Finnhub's own `finnhubIndustry`
//                        classification (already live elsewhere in this
//                        codebase — see finnhubService.js)
//   eps                 { trailing: number|null, forward: number|null }
//   epsGrowthYoY        number|null — used as the PEG growth-rate input
//   revenuePerShare     number|null
//   bookValuePerShare   number|null
//   fcfPerShare         number|null
//   ebitdaPerShare      number|null
//   netDebtPerShare     number|null — needed to convert an EV/EBITDA-implied
//                       enterprise value back to an equity price per
//                       share (FAIR_VALUE_METHODOLOGY.md §1.2)
//   roic                number|null
//   directRatios        { pe, forwardPe, peg, evEbitda, ps, pb, fcfYield } —
//                       Finnhub's OWN precomputed ratios where its
//                       response provides them directly, preferred over
//                       re-deriving from per-share components when present
//
// **A note on field-name confidence, disclosed exactly as
// VALUATION_RESEARCH.md itself disclosed it**: the exact field names
// Finnhub's `/stock/metric?metric=all` response uses for P/S, P/B,
// EV/EBITDA, ROIC, and FCF-per-share were not independently re-verified
// live against Finnhub's current docs during this phase (the same
// disclosed uncertainty VALUATION_RESEARCH.md §1/§10 already flagged).
// `extractFirstFinite()` below defends against this by trying several
// real, documented candidate field names per metric and honestly
// returning `null` if none are present — never guessing a value from an
// unrelated field.
const axios = require("axios");
const { FINNHUB_API_KEY } = require("../../../config/env");
const { createSecValuationProvider } = require("./secValuationProvider");

const DEFAULT_TIMEOUT_MS = 8000;

function emptyMetrics(symbol, reason) {
  return {
    symbol,
    asOf: new Date().toISOString(),
    dataAvailable: false,
    unavailableReason: reason,
    price: null,
    industry: null,
    eps: { trailing: null, forward: null },
    epsGrowthYoY: null,
    revenuePerShare: null,
    bookValuePerShare: null,
    fcfPerShare: null,
    ebitdaPerShare: null,
    netDebtPerShare: null,
    roic: null,
    directRatios: { pe: null, forwardPe: null, peg: null, evEbitda: null, ps: null, pb: null, fcfYield: null },
  };
}

function isConfigured() {
  return Boolean(FINNHUB_API_KEY);
}

function extractFirstFinite(source, candidateKeys) {
  for (const key of candidateKeys) {
    const value = source?.[key];
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function hasUsableValuationData(metrics) {
  if (!Number.isFinite(metrics.price) || metrics.price <= 0) return false;
  const observations = [
    metrics.eps?.trailing,
    metrics.eps?.forward,
    metrics.revenuePerShare,
    metrics.bookValuePerShare,
    metrics.fcfPerShare,
    metrics.ebitdaPerShare,
    ...Object.values(metrics.directRatios || {}),
  ];
  return observations.some(Number.isFinite);
}

/**
 * The default, real implementation: Finnhub's `/stock/metric?metric=all`
 * (the same endpoint finnhubService.js's getQuote() already calls) and
 * `/stock/profile2` (for `finnhubIndustry` and share price context) —
 * no new vendor relationship, reusing the credential already configured
 * for the rest of this platform's live data.
 */
function createFinnhubValuationDataProvider({ timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const secFallback = createSecValuationProvider({ timeoutMs });
  async function getSymbolValuation(symbol) {
    if (!isConfigured()) {
      return secFallback.getSymbolValuation(symbol);
    }

    let metric;
    let profile;
    let quote;
    try {
      const [metricResponse, profileResponse, quoteResponse] = await Promise.all([
        axios.get("https://finnhub.io/api/v1/stock/metric", { params: { symbol, metric: "all", token: FINNHUB_API_KEY }, timeout: timeoutMs }),
        axios.get("https://finnhub.io/api/v1/stock/profile2", { params: { symbol, token: FINNHUB_API_KEY }, timeout: timeoutMs }),
        axios.get("https://finnhub.io/api/v1/quote", { params: { symbol, token: FINNHUB_API_KEY }, timeout: timeoutMs }),
      ]);
      metric = metricResponse.data?.metric || {};
      profile = profileResponse.data || {};
      quote = quoteResponse.data || {};
    } catch (error) {
      const sec = await secFallback.getSymbolValuation(symbol);
      if (sec.dataAvailable) {
        sec.primaryUnavailableReason = `Finnhub request failed: ${error?.message || "unknown error"}`;
        return sec;
      }
      return emptyMetrics(symbol, `Finnhub request failed: ${error?.message || "unknown error"}. SEC fallback unavailable: ${sec.unavailableReason}`);
    }

    const result = {
      symbol,
      asOf: new Date().toISOString(),
      sourceProvider: "Finnhub",
      dataAvailable: true,
      unavailableReason: null,
      price: Number.isFinite(quote.c) ? quote.c : null,
      industry: profile.finnhubIndustry || null,
      eps: {
        trailing: extractFirstFinite(metric, ["epsTTM", "epsBasicExclExtraItemsTTM", "epsExclExtraItemsTTM"]),
        forward: extractFirstFinite(metric, ["epsForward", "epsNextYear", "epsEstimateNTM"]),
      },
      epsGrowthYoY: extractFirstFinite(metric, ["epsGrowthTTMYoy", "epsGrowth3Y", "epsGrowth5Y"]),
      revenuePerShare: extractFirstFinite(metric, ["revenuePerShareTTM", "revenuePerShareAnnual"]),
      bookValuePerShare: extractFirstFinite(metric, ["bookValuePerShareAnnual", "bookValuePerShareQuarterly", "tangibleBookValuePerShareAnnual"]),
      fcfPerShare: extractFirstFinite(metric, ["focfPerShareTTM", "freeCashFlowPerShareTTM", "pfcfShareTTM"]),
      ebitdaPerShare: extractFirstFinite(metric, ["ebitdaPerShareTTM", "ebitdaPerShareAnnual"]),
      netDebtPerShare: extractFirstFinite(metric, ["netDebtPerShareAnnual", "netDebtPerShareQuarterly"]),
      roic: extractFirstFinite(metric, ["roicTTM", "roiTTM", "roiAnnual"]),
      directRatios: {
        pe: extractFirstFinite(metric, ["peTTM", "peAnnual", "peExclExtraTTM"]),
        forwardPe: extractFirstFinite(metric, ["peForward", "forwardPE"]),
        peg: extractFirstFinite(metric, ["pegTTM", "pegAnnual"]),
        evEbitda: extractFirstFinite(metric, ["currentEvToEbitdaTTM", "evToEbitdaTTM", "evEbitdaTTM"]),
        ps: extractFirstFinite(metric, ["psTTM", "psAnnual"]),
        pb: extractFirstFinite(metric, ["pbAnnual", "pbQuarterly"]),
        fcfYield: extractFirstFinite(metric, ["fcfYieldTTM", "freeCashFlowYieldTTM"]),
      },
    };
    if (!hasUsableValuationData(result)) {
      const sec = await secFallback.getSymbolValuation(symbol);
      if (sec.dataAvailable && hasUsableValuationData(sec)) {
        sec.primaryUnavailableReason = "Finnhub returned no usable price-plus-fundamental valuation set.";
        return sec;
      }
      return emptyMetrics(symbol, `No verified price-plus-fundamental valuation set is available. SEC fallback: ${sec.unavailableReason || "insufficient data"}`);
    }
    return result;
  }

  return { getSymbolValuation };
}

module.exports = { createFinnhubValuationDataProvider, emptyMetrics, isConfigured, extractFirstFinite, hasUsableValuationData };
