const { createProvider, honestStubFetch } = require("../providerFactory");

module.exports = createProvider(
  {
    providerId: "majorEarnings",
    label: "Major Earnings",
    sourceType: "corporate-filing",
    category: "earnings",
    defaultThemes: [],
    rateLimit: { maxPerMinute: 20 },
  },
  honestStubFetch
);
