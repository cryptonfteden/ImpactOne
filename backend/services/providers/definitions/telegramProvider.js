const { createProvider, honestStubFetch } = require("../providerFactory");

module.exports = createProvider(
  {
    providerId: "telegram",
    label: "Telegram",
    sourceType: "social",
    category: "geopolitics",
    defaultThemes: [],
    rateLimit: { maxPerMinute: 60 },
  },
  honestStubFetch
);
