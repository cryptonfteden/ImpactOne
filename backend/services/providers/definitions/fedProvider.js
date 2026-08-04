const { createProvider, honestStubFetch } = require("../providerFactory");

module.exports = createProvider(
  {
    providerId: "fed",
    label: "Federal Reserve",
    sourceType: "central-bank",
    category: "centralBanks",
    defaultThemes: [],
    rateLimit: { maxPerMinute: 10 },
  },
  honestStubFetch
);
