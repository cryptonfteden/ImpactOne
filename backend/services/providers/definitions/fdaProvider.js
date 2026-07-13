const { createProvider, honestStubFetch } = require("../providerFactory");

module.exports = createProvider(
  {
    providerId: "fda",
    label: "FDA",
    sourceType: "government",
    category: "healthcare",
    defaultThemes: ["healthcare"],
    rateLimit: { maxPerMinute: 10 },
  },
  honestStubFetch
);
