const { createProvider, honestStubFetch } = require("../providerFactory");

module.exports = createProvider(
  {
    providerId: "congress",
    label: "US Congress",
    sourceType: "government",
    category: "regulation",
    defaultThemes: [],
    rateLimit: { maxPerMinute: 10 },
  },
  honestStubFetch
);
