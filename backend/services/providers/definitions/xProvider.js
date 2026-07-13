const { createProvider, honestStubFetch } = require("../providerFactory");

module.exports = createProvider(
  {
    providerId: "x",
    label: "X (Twitter)",
    sourceType: "social",
    category: "consumer",
    defaultThemes: [],
    rateLimit: { maxPerMinute: 60 },
  },
  honestStubFetch
);
