const { createProvider, honestStubFetch } = require("../providerFactory");

module.exports = createProvider(
  {
    providerId: "sec",
    label: "SEC (EDGAR filings)",
    sourceType: "regulatory-filing",
    category: "regulation",
    defaultThemes: [],
    rateLimit: { maxPerMinute: 10 },
  },
  honestStubFetch
);
