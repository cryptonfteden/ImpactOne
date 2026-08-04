const { createProvider, honestStubFetch } = require("../providerFactory");

module.exports = createProvider(
  {
    providerId: "patentFeeds",
    label: "Patent Feeds",
    sourceType: "government",
    category: "ai",
    defaultThemes: [],
    rateLimit: { maxPerMinute: 10 },
  },
  honestStubFetch
);
