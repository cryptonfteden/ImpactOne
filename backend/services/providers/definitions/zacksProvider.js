// Sprint 37 — Zacks Rank/estimate data requires a Zacks Elite/institutional
// data license (paid). No credential exists in this environment. Complete,
// contract-conforming adapter boundary; honestly UNCONFIGURED until a real
// license is obtained.
const { createProvider, honestStubFetch } = require("../providerFactory");

const CONFIGURATION_REQUIREMENT = "Zacks Elite / institutional data license (paid) — https://www.zacks.com. No free/no-auth equivalent exists for rank data.";

module.exports = createProvider(
  {
    providerId: "zacks",
    label: "Zacks Rank",
    sourceType: "analyst-rating",
    category: "equities",
    defaultThemes: [],
    rateLimit: { maxPerMinute: 30 },
  },
  honestStubFetch
);
module.exports.configurationRequirement = CONFIGURATION_REQUIREMENT;
