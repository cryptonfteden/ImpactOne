// Sprint 37 — SPDR (State Street) sector-ETF holdings/flow data. Daily
// holdings CSVs are technically published on ssga.com without a login,
// but real-time creation/redemption flow data (the institutional-activity
// signal actually useful here) requires a licensed data feed. Parsing the
// public holdings CSVs was out of this sprint's time budget — complete,
// contract-conforming adapter boundary; honestly UNCONFIGURED rather than
// a half-built CSV scraper presented as done.
const { createProvider, honestStubFetch } = require("../providerFactory");

const CONFIGURATION_REQUIREMENT = "State Street SPDR flow data — real-time creation/redemption flows require a licensed feed; daily holdings CSVs are public (ssga.com) but not yet integrated (out of this sprint's scope).";

module.exports = createProvider(
  {
    providerId: "spdr",
    label: "SPDR Sector Flows",
    sourceType: "institutional",
    category: "sector-flows",
    defaultThemes: [],
    rateLimit: { maxPerMinute: 20 },
  },
  honestStubFetch
);
module.exports.configurationRequirement = CONFIGURATION_REQUIREMENT;
