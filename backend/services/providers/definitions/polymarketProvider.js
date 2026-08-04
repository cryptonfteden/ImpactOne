const { createProvider, honestStubFetch } = require("../providerFactory");

module.exports = createProvider(
  {
    providerId: "polymarket",
    label: "Polymarket",
    sourceType: "prediction-market",
    category: "macro",
    defaultThemes: [],
    rateLimit: { maxPerMinute: 20 },
  },
  honestStubFetch
);
