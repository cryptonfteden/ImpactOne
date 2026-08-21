// Phase VALUATION-AGENT-001 — the sector/peer-group data abstraction
// VALUATION_RESEARCH.md §9 and VALUATION_SCORING_MODEL.md §3 describe.
// FAIR_VALUE_METHODOLOGY.md §1.2 requires a SECTOR-RELATIVE target
// multiple for every implied-price formula (never the company's own
// current multiple, which would be circular) — so this provider's
// output is a hard input dependency for the whole Fair Value composite,
// not a nice-to-have enrichment.
//
// ## The interface
// A conforming provider is any object exposing:
//   async getSectorReference(industry) -> SectorReference
//
// `SectorReference` shape:
//   industry          string|null — the industry this reference is for
//   source             "sector-peer-group" | "broad-market-reference" | "unavailable"
//   peerGroupSize      number — 0 when no real peer group is connected
//   multiples          { pe, forwardPe, peg, evEbitda, ps, pb, fcfYield } —
//                      each a real median value (number) or null
//   wacc               number|null — a cost-of-capital proxy, as a percent
//                      (e.g. 8 for 8%), used only as the ROIC value-trap
//                      gate (VALUATION_RESEARCH.md §8), never as a price input
//
// ## Extension points (mission requirement: "prepare clean extension
// points for SEC EDGAR, Alpha Vantage, future providers")
// A real, richer provider would implement the exact same
// `getSectorReference(industry)` signature backed by:
//   - This platform's own tracked-symbol universe grouped by
//     `finnhubIndustry` (VALUATION_RESEARCH.md §9's option (a)) — not
//     built this phase; no symbol-universe query service exists yet.
//   - The Damodaran NYU Stern industry-average dataset
//     (VALUATION_RESEARCH.md §10) — a free, periodically-refreshed
//     academic source, not independently re-verified live this phase.
//   - SEC EDGAR's free, no-auth XBRL APIs — a genuine, live-confirmed,
//     official source for trailing financials (not forward estimates),
//     useful as a validation/fallback layer per VALUATION_RESEARCH.md §10.
//   - Alpha Vantage's `OVERVIEW` function — a second, already-partially-
//     wired vendor path for forward estimates (Forward P/E, PEG's growth
//     input) — VALUATION_RESEARCH.md §1 explicitly flags this codebase's
//     existing `alphaVantageService.js` no-key fallback as returning
//     UNDISCLOSED fake data; any real Alpha Vantage integration for this
//     agent must go through a new, honestly-labeled path, never reuse
//     that existing function's fallback behavior as-is.
// Hand-set market multiples must never create a target price: they are
// documentation constants only, not verified, current sector evidence.
//
// The production default now uses Prof. Aswath Damodaran's NYU Stern U.S.
// industry tables. They are free, dated, source-linked sector observations
// with a disclosed number of firms. The tables update periodically rather
// than intraday, so every response carries its source date and freshness.
const axios = require("axios");
const { sharedProviderCache } = require("../../redisCache/providerCache");

const DAMODARAN_BASE_URL = "https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile";
const DAMODARAN_SOURCE_URL = `${DAMODARAN_BASE_URL}/datacurrent.html`;
const DAMODARAN_DATASETS = Object.freeze({
  pe: { url: `${DAMODARAN_BASE_URL}/pedata.html`, columns: { firms: 1, pe: 4, forwardPe: 5, peg: 9 } },
  ps: { url: `${DAMODARAN_BASE_URL}/psdata.html`, columns: { firms: 1, ps: 2 } },
  pb: { url: `${DAMODARAN_BASE_URL}/pbvdata.html`, columns: { firms: 1, pb: 2 } },
  ev: { url: `${DAMODARAN_BASE_URL}/vebitda.html`, columns: { firms: 1, evEbitda: 3 } },
  wacc: { url: `${DAMODARAN_BASE_URL}/wacc.html`, columns: { firms: 1, wacc: 10 } },
});

const INDUSTRY_ALIASES = Object.freeze({
  technology: ["computer services", "computers/peripherals", "electronics", "semiconductor", "software", "telecom equipment"],
  software: ["software (system & application)", "software (internet)"],
  semiconductors: ["semiconductor"],
  media: ["broadcasting", "entertainment", "publishing & newspapers"],
  automobiles: ["auto & truck", "auto parts"],
  automotive: ["auto & truck", "auto parts"],
  biotechnology: ["drugs (biotechnology)"],
  pharmaceuticals: ["drugs (pharmaceutical)"],
  healthcare: ["healthcare products", "healthcare support services", "hospitals/healthcare facilities", "drugs"],
  banks: ["bank (money center)", "banks (regional)"],
  "financial services": ["brokerage & investment banking", "financial svcs.", "investments & asset management", "insurance"],
  energy: ["oil/gas", "coal", "green & renewable energy", "power"],
  utilities: ["utility"],
  telecommunications: ["telecom"],
  transportation: ["transportation", "air transport", "trucking", "railroads"],
  retail: ["retail"],
  realestate: ["r.e.i.t.", "real estate"],
  "real estate": ["r.e.i.t.", "real estate"],
  industrials: ["aerospace/defense", "building materials", "engineering/construction", "machinery", "transportation"],
  "consumer cyclical": ["apparel", "auto", "furn/home furnishings", "retail", "recreation"],
  "consumer defensive": ["beverage", "food", "household products", "tobacco"],
});

function decodeHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function finiteCell(value) {
  const normalized = String(value || "").replace(/[,$%]/g, "").trim();
  if (!normalized || /^n\/?a$/i.test(normalized)) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function normalizeIndustry(value) {
  return decodeHtml(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function parseIndustryTable(html, columns) {
  const rows = [];
  for (const match of String(html || "").matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...match[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => decodeHtml(cell[1]));
    if (cells.length <= Math.max(0, columns.firms)) continue;
    const firms = finiteCell(cells[columns.firms]);
    if (!cells[0] || !Number.isFinite(firms) || firms <= 0) continue;
    const row = { industry: cells[0], normalizedIndustry: normalizeIndustry(cells[0]), firms };
    for (const [key, index] of Object.entries(columns)) {
      if (key !== "firms") row[key] = finiteCell(cells[index]);
    }
    rows.push(row);
  }
  return rows;
}

function extractSourceAsOf(html) {
  const text = decodeHtml(html);
  return text.match(/Data used is as of\s+([^<]{4,40}?)(?:Download|Industry Name|$)/i)?.[1]?.trim() || null;
}

function weightedMedian(rows, key) {
  const values = rows.filter((row) => Number.isFinite(row[key]) && Number.isFinite(row.firms) && row.firms > 0)
    .sort((a, b) => a[key] - b[key]);
  const totalWeight = values.reduce((sum, row) => sum + row.firms, 0);
  if (!totalWeight) return null;
  let running = 0;
  for (const row of values) {
    running += row.firms;
    if (running >= totalWeight / 2) return row[key];
  }
  return values.at(-1)?.[key] ?? null;
}

function selectIndustryNames(rows, industry) {
  const normalized = normalizeIndustry(industry);
  if (!normalized) return [];
  const exact = rows.find((row) => row.normalizedIndustry === normalized);
  if (exact) return [exact.industry];

  const aliases = INDUSTRY_ALIASES[normalized] || [normalized];
  const matches = rows.filter((row) => aliases.some((alias) => {
    const key = normalizeIndustry(alias);
    return row.normalizedIndustry === key || row.normalizedIndustry.includes(key) || key.includes(row.normalizedIndustry);
  }));
  return [...new Set(matches.map((row) => row.industry))];
}

function unavailableReference(industry, reason) {
  return {
    industry: industry || null,
    source: "unavailable",
    peerGroupSize: 0,
    multiples: { pe: null, forwardPe: null, peg: null, evEbitda: null, ps: null, pb: null, fcfYield: null },
    wacc: null,
    sourceProvider: "NYU Stern / Damodaran U.S. industry averages",
    sourceUrl: DAMODARAN_SOURCE_URL,
    unavailableReason: reason,
  };
}

function createDamodaranPeerGroupProvider({ httpGet = axios.get, cache = sharedProviderCache, ttlMs = 7 * 24 * 60 * 60 * 1000 } = {}) {
  async function loadDataset() {
    return cache.getOrCompute("provider:damodaran-us-industry-multiples", async () => {
      const entries = await Promise.all(Object.entries(DAMODARAN_DATASETS).map(async ([key, config]) => {
        const response = await httpGet(config.url, { timeout: 20_000, responseType: "text" });
        return [key, { rows: parseIndustryTable(response.data, config.columns), sourceAsOf: extractSourceAsOf(response.data), url: config.url }];
      }));
      return Object.fromEntries(entries);
    }, { ttlMs, shouldCache: (value) => Object.values(value || {}).every((dataset) => dataset.rows?.length > 20) });
  }

  async function getSectorReference(industry) {
    if (!industry) return unavailableReference(null, "The company industry is unavailable, so no honest sector comparison can be selected.");
    try {
      const data = await loadDataset();
      const matchedIndustries = selectIndustryNames(data.pe.rows, industry);
      if (!matchedIndustries.length) {
        return unavailableReference(industry, `NYU Stern has no reliable industry match for ${industry}.`);
      }
      const selected = {};
      for (const [key, dataset] of Object.entries(data)) {
        selected[key] = dataset.rows.filter((row) => matchedIndustries.includes(row.industry));
      }
      const peerGroupSize = selected.pe.reduce((sum, row) => sum + row.firms, 0);
      const sourceAsOf = data.pe.sourceAsOf || data.ps.sourceAsOf || null;
      return {
        industry,
        matchedIndustries,
        matchMethod: matchedIndustries.length === 1 ? "direct-industry" : "weighted-sector-basket",
        source: "sector-peer-group",
        sourceProvider: "NYU Stern / Damodaran U.S. industry averages",
        sourceUrl: DAMODARAN_SOURCE_URL,
        sourceAsOf,
        freshness: "periodic-industry-benchmark",
        peerGroupSize,
        multiples: {
          pe: weightedMedian(selected.pe, "pe"),
          forwardPe: weightedMedian(selected.pe, "forwardPe"),
          peg: weightedMedian(selected.pe, "peg"),
          evEbitda: weightedMedian(selected.ev, "evEbitda"),
          ps: weightedMedian(selected.ps, "ps"),
          pb: weightedMedian(selected.pb, "pb"),
          fcfYield: null,
        },
        wacc: weightedMedian(selected.wacc, "wacc"),
        unavailableReason: null,
      };
    } catch (error) {
      return unavailableReference(industry, `NYU Stern industry benchmark could not be loaded: ${error.message}`);
    }
  }
  return { getSectorReference, loadDataset };
}

// Disclosed, hand-set, REAL (not fabricated) broad-market reference
// multiples — approximate long-run U.S. public-market medians, used
// only as an honest MVP stand-in until a real sector-specific peer group
// or the Damodaran dataset is connected. These are NOT sector-specific,
// which is precisely why `peerGroupQualityScore` (confidenceModel.js)
// scores this tier at 0 — a real discount on confidence, never hidden.
const BROAD_MARKET_REFERENCE_MULTIPLES = Object.freeze({
  pe: 20,
  forwardPe: 18,
  peg: 1.5,
  evEbitda: 12,
  ps: 3,
  pb: 3,
  fcfYield: 4, // percent
});

// A single, disclosed, hand-set cost-of-capital proxy (percent) used
// only when no real sector-specific WACC estimate is available — see
// VALUATION_RESEARCH.md §8's own acknowledgment that a full per-company
// CAPM computation is out of scope for an MVP. Approximates a typical
// blended cost of capital for a mature public company; explicitly NOT
// sector-specific.
const DEFAULT_WACC_PROXY_PERCENT = 8;

function createBroadMarketPeerGroupProvider() {
  async function getSectorReference(industry) {
    return {
      industry: industry || null,
      source: "unavailable",
      peerGroupSize: 0,
      multiples: { pe: null, forwardPe: null, peg: null, evEbitda: null, ps: null, pb: null, fcfYield: null },
      wacc: null,
      unavailableReason: "No verified current sector peer-group multiple source is connected.",
    };
  }
  return { getSectorReference };
}

module.exports = {
  createBroadMarketPeerGroupProvider,
  createDamodaranPeerGroupProvider,
  parseIndustryTable,
  selectIndustryNames,
  weightedMedian,
  DAMODARAN_DATASETS,
  DAMODARAN_SOURCE_URL,
  BROAD_MARKET_REFERENCE_MULTIPLES,
  DEFAULT_WACC_PROXY_PERCENT,
};
