const { createProvider, honestStubFetch } = require("../providerFactory");

module.exports = createProvider(
  {
    providerId: "reddit",
    label: "Reddit",
    sourceType: "social",
    category: "consumer",
    defaultThemes: [],
    rateLimit: { maxPerMinute: 60 },
  },
  honestStubFetch
);
