// Sprint 37 — real unusual-options-activity data (sweep/block
// classification, gamma exposure) requires a specialized paid vendor
// (e.g. a flow-data provider or a direct OPRA feed license) — no free,
// no-auth equivalent exists for this data. No credential exists in this
// environment. Complete, contract-conforming adapter boundary; honestly
// UNCONFIGURED until a real vendor relationship is established.
//
// Phase AI-ENGINE-001.1 — extended per OPTIONS_AGENT_ARCHITECTURE.md §3/§9
// with two named, contract-shaped fetch functions (trade prints and OI
// snapshots are genuinely different real-world feeds/cadences — see the
// architecture doc's two-scheduler design) plus an explicit isConfigured()
// check. Every one of these still resolves through honestStubFetch — this
// commit does not connect a real vendor, it only gives the normalizer/
// detection engine two concrete, documented functions to call once one
// exists, so that day's change is additive (swap the fetchImpl, nothing
// else) rather than a redesign.
const { createProvider, honestStubFetch } = require("../providerFactory");

const CONFIGURATION_REQUIREMENT = "Real-time sweep/block/gamma analytics require a licensed options-flow vendor. ImpactOne falls back to official OCC end-of-day customer Call/Put volume without inventing unavailable fields.";

// A real credential/env-var check, not a hardcoded false — mirrors every
// other "is this provider actually usable" check in this codebase
// (e.g. finnhubService's own API-key presence check). No credential name
// is invented here beyond what CONFIGURATION_REQUIREMENT already
// discloses; until one is set, this always reports false.
function isConfigured() {
  return Boolean(process.env.OPTIONS_FLOW_PROVIDER_API_KEY);
}

// Raw trade prints (contract, size, price, exchange, bid/ask at
// execution) — see OPTIONS_AGENT_DATA_MODEL.md's OptionsFlowPrint. Same
// honest-stub behavior as the registry's default `fetch` until a vendor
// is configured: never fabricates a print.
async function fetchTradePrints() {
  if (!isConfigured()) {
    return honestStubFetch();
  }
  // Intentionally unreachable until a real vendor is connected — no
  // fabricated request/parsing logic is written against a vendor this
  // environment does not have credentials for.
  return honestStubFetch();
}

// Daily end-of-day open-interest snapshots — see
// OPTIONS_AGENT_DATA_MODEL.md's OptionsOpenInterestSnapshot. Same
// honest-stub discipline.
async function fetchOpenInterestSnapshots() {
  if (!isConfigured()) {
    return honestStubFetch();
  }
  return honestStubFetch();
}

module.exports = createProvider(
  {
    providerId: "optionsFlow",
    label: "Equity Options Flow",
    sourceType: "equity-options",
    category: "equities",
    defaultThemes: [],
    rateLimit: { maxPerMinute: 20 },
  },
  honestStubFetch
);
module.exports.configurationRequirement = CONFIGURATION_REQUIREMENT;
module.exports.isConfigured = isConfigured;
module.exports.fetchTradePrints = fetchTradePrints;
module.exports.fetchOpenInterestSnapshots = fetchOpenInterestSnapshots;
