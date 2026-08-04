// Phase EARNINGS-AGENT-001 — the provider abstraction the mission
// requires. Anything downstream (growthAnalyzer, surpriseAnalyzer,
// outlookAnalyzer, earningsHealthAnalyzer, riskOpportunity, aiSummary,
// the agent itself) depends only on the shape documented below, never
// on where the numbers came from — so a future dedicated
// fundamentals/earnings vendor can be wired in as a second
// implementation of this exact interface without touching a single
// line of analysis code.
//
// ## The interface
// A conforming provider is any object exposing:
//   async getSymbolEarnings(symbol) -> EarningsMetrics
//
// `EarningsMetrics` shape (every field always present; a field this
// provider cannot really compute is `null`/empty, NEVER fabricated):
//   symbol              string
//   asOf                ISO string
//   dataAvailable       boolean — false when no real data could be
//                       fetched (no API key configured, or the fetch
//                       itself failed/timed out) — every other field is
//                       then honestly empty/null.
//   unavailableReason   string|null
//   epsHistory          Array<{ period, actual, estimate, surprise, surprisePercent }>
//                       most-recent-first, real reported quarters only
//   revenue             { growthYoY: number|null }
//   eps                 { growthYoY: number|null }
//   margins             { netProfitMargin: number|null, grossMargin: number|null }
//   cashFlow            { freeCashFlowGrowthYoY: number|null } — null today,
//                       see "Honest limitations" in EARNINGS_AGENT.md:
//                       no connected data source exposes this yet.
//   guidance            { changed: boolean|null, direction: "RAISED"|"LOWERED"|"MAINTAINED"|null } —
//                       null/null today: no forward-guidance text/number
//                       feed is connected (see EARNINGS_AGENT.md).
//   analystRevisions    { direction: "UP"|"DOWN"|"MIXED"|null, count: number|null } —
//                       null today: no analyst-revision feed is connected.
const axios = require("axios");
const { FINNHUB_API_KEY } = require("../../../config/env");

const DEFAULT_TIMEOUT_MS = 8000;
const EARNINGS_QUARTERS_LIMIT = 4;

function emptyMetrics(symbol, reason) {
  return {
    symbol,
    asOf: new Date().toISOString(),
    dataAvailable: false,
    unavailableReason: reason,
    epsHistory: [],
    revenue: { growthYoY: null },
    eps: { growthYoY: null },
    margins: { netProfitMargin: null, grossMargin: null },
    cashFlow: { freeCashFlowGrowthYoY: null },
    guidance: { changed: null, direction: null },
    analystRevisions: { direction: null, count: null },
  };
}

function isConfigured() {
  return Boolean(FINNHUB_API_KEY);
}

/**
 * The default, real implementation: Finnhub's free-tier `/stock/earnings`
 * (quarterly actual/estimate/surprise EPS) and `/stock/metric` (real
 * growth/margin ratios) endpoints — the same provider (and the same
 * "real network call, honestly degrade on any failure" discipline) this
 * platform's own finnhubService.js already uses for live quotes. No new
 * paid vendor relationship — reuses the credential already configured
 * for the rest of this platform's live data.
 */
function createFinnhubEarningsDataProvider({ timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  async function getSymbolEarnings(symbol) {
    if (!isConfigured()) {
      return emptyMetrics(symbol, "No Finnhub API key is configured — set FINNHUB_API_KEY.");
    }

    let earningsRows;
    let metric;
    try {
      const [earningsResponse, metricResponse] = await Promise.all([
        axios.get("https://finnhub.io/api/v1/stock/earnings", { params: { symbol, token: FINNHUB_API_KEY }, timeout: timeoutMs }),
        axios.get("https://finnhub.io/api/v1/stock/metric", { params: { symbol, metric: "all", token: FINNHUB_API_KEY }, timeout: timeoutMs }),
      ]);
      earningsRows = Array.isArray(earningsResponse.data) ? earningsResponse.data : [];
      metric = metricResponse.data?.metric || {};
    } catch (error) {
      return emptyMetrics(symbol, error?.message || "Failed to fetch real earnings data.");
    }

    const epsHistory = earningsRows
      .slice(0, EARNINGS_QUARTERS_LIMIT)
      .map((row) => ({
        period: row.period ?? null,
        actual: Number.isFinite(row.actual) ? row.actual : null,
        estimate: Number.isFinite(row.estimate) ? row.estimate : null,
        surprise: Number.isFinite(row.surprise) ? row.surprise : null,
        surprisePercent: Number.isFinite(row.surprisePercent) ? row.surprisePercent : null,
      }));

    return {
      symbol,
      asOf: new Date().toISOString(),
      dataAvailable: true,
      unavailableReason: null,
      epsHistory,
      revenue: { growthYoY: Number.isFinite(metric.revenueGrowthTTMYoy) ? metric.revenueGrowthTTMYoy : null },
      eps: { growthYoY: Number.isFinite(metric.epsGrowthTTMYoy) ? metric.epsGrowthTTMYoy : null },
      margins: {
        netProfitMargin: Number.isFinite(metric.netProfitMarginTTM) ? metric.netProfitMarginTTM : null,
        grossMargin: Number.isFinite(metric.grossMarginTTM) ? metric.grossMarginTTM : null,
      },
      // Finnhub's free-tier metric set does not include a real cash-flow
      // growth figure — honestly null, not derived from an unrelated proxy.
      cashFlow: { freeCashFlowGrowthYoY: null },
      // No forward-guidance text/number feed and no analyst-revision feed
      // is connected — honestly null on both, exactly the same discipline
      // OPTIONS-AGENT-001 used for unavailable Greeks/IV data.
      guidance: { changed: null, direction: null },
      analystRevisions: { direction: null, count: null },
    };
  }

  return { getSymbolEarnings };
}

module.exports = { createFinnhubEarningsDataProvider, emptyMetrics, isConfigured, EARNINGS_QUARTERS_LIMIT };
