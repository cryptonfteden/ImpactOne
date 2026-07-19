// Sprint 37 — Finviz's screener/ratings data is only available via their
// paid Elite API or by scraping finviz.com, which its Terms of Service
// prohibit for automated/commercial use without a license. No credential
// exists in this environment and scraping would bypass access controls
// the mission explicitly forbids. Complete, contract-conforming adapter
// boundary; honestly UNCONFIGURED (never fabricates data) until a real
// Finviz Elite subscription is provisioned.
const { createProvider, honestStubFetch } = require("../providerFactory");

const CONFIGURATION_REQUIREMENT = "Finviz Elite API subscription (paid) — https://finviz.com/elite.ashx. No free/no-auth equivalent exists for ratings data.";

module.exports = createProvider(
  {
    providerId: "finviz",
    label: "Finviz Analyst Ratings",
    sourceType: "analyst-rating",
    category: "equities",
    defaultThemes: [],
    rateLimit: { maxPerMinute: 30 },
  },
  honestStubFetch
);
module.exports.configurationRequirement = CONFIGURATION_REQUIREMENT;
