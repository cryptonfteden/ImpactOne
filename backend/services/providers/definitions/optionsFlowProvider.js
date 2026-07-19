// Sprint 37 — real unusual-options-activity data (sweep/block
// classification, gamma exposure) requires a specialized paid vendor
// (e.g. a flow-data provider or a direct OPRA feed license) — no free,
// no-auth equivalent exists for this data. No credential exists in this
// environment. Complete, contract-conforming adapter boundary; honestly
// UNCONFIGURED until a real vendor relationship is established.
const { createProvider, honestStubFetch } = require("../providerFactory");

const CONFIGURATION_REQUIREMENT = "Equity options flow vendor (e.g. a specialized unusual-activity data provider, or a direct OPRA feed license) — paid, no free equivalent for sweep/block/gamma data.";

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
