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
// None of these are connected this phase — the default implementation
// below is the disclosed, hand-set fallback tier this situation calls
// for, documented exactly as such.

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
      source: "broad-market-reference",
      peerGroupSize: 0,
      multiples: { ...BROAD_MARKET_REFERENCE_MULTIPLES },
      wacc: DEFAULT_WACC_PROXY_PERCENT,
    };
  }
  return { getSectorReference };
}

module.exports = { createBroadMarketPeerGroupProvider, BROAD_MARKET_REFERENCE_MULTIPLES, DEFAULT_WACC_PROXY_PERCENT };
