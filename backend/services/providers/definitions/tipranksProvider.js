// Sprint 37 — TipRanks' analyst-consensus data requires their commercial
// Data API (enterprise licensing, application + contract). No credential
// exists in this environment. Complete, contract-conforming adapter
// boundary; honestly UNCONFIGURED until a real license is obtained.
const { createProvider, honestStubFetch } = require("../providerFactory");

const CONFIGURATION_REQUIREMENT = "TipRanks Data API — commercial license required (https://www.tipranks.com/api), application + contract, no self-serve free tier.";

module.exports = createProvider(
  {
    providerId: "tipranks",
    label: "TipRanks Analyst Consensus",
    sourceType: "analyst-rating",
    category: "equities",
    defaultThemes: [],
    rateLimit: { maxPerMinute: 30 },
  },
  honestStubFetch
);
module.exports.configurationRequirement = CONFIGURATION_REQUIREMENT;
