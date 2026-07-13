const { createProvider, honestStubFetch } = require("../providerFactory");

module.exports = createProvider(
  {
    providerId: "usTreasury",
    label: "US Treasury",
    sourceType: "government",
    category: "macro",
    defaultThemes: [],
    rateLimit: { maxPerMinute: 10 },
  },
  honestStubFetch
);
