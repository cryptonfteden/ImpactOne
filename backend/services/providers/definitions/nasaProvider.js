const { createProvider, honestStubFetch } = require("../providerFactory");

module.exports = createProvider(
  {
    providerId: "nasa",
    label: "NASA",
    sourceType: "government",
    category: "space",
    defaultThemes: ["space"],
    rateLimit: { maxPerMinute: 10 },
  },
  honestStubFetch
);
