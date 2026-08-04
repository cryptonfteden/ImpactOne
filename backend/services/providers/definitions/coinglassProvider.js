// Sprint 37 — CoinGlass's full derivatives dataset (funding rate history,
// liquidation heatmaps, multi-exchange OI) requires their paid API tier;
// the free tier is heavily rate-limited and missing most fields this
// sprint's cryptoDerivativesService model needs. No credential exists in
// this environment. Complete, contract-conforming adapter boundary;
// honestly UNCONFIGURED until a real subscription is provisioned.
const { createProvider, honestStubFetch } = require("../providerFactory");

const CONFIGURATION_REQUIREMENT = "CoinGlass API — paid tier required for funding-rate history, liquidation, and multi-exchange OI data (https://www.coinglass.com/pricing).";

module.exports = createProvider(
  {
    providerId: "coinglass",
    label: "CoinGlass Crypto Derivatives",
    sourceType: "crypto-derivatives",
    category: "crypto",
    defaultThemes: [],
    rateLimit: { maxPerMinute: 20 },
  },
  honestStubFetch
);
module.exports.configurationRequirement = CONFIGURATION_REQUIREMENT;
