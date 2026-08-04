const { createProvider, honestStubFetch } = require("../providerFactory");

module.exports = createProvider(
  {
    providerId: "fomc",
    label: "FOMC",
    sourceType: "central-bank",
    category: "centralBanks",
    defaultThemes: [],
    rateLimit: { maxPerMinute: 10 },
  },
  honestStubFetch
);
