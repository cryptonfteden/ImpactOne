const axios = require("axios");
const { createUnifiedProvider } = require("../providerAbstraction");

const BINANCE_FUTURES_URL = "https://fapi.binance.com";
const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];

function toCryptoDerivativesEvent(symbol, funding, openInterest) {
  const fundingRate = Number(funding?.fundingRate);
  const contracts = Number(openInterest?.openInterest);
  const timestamp = Number(funding?.fundingTime || openInterest?.time);
  if (!Number.isFinite(fundingRate) || !Number.isFinite(contracts)) return null;

  return {
    eventType: "binance-futures-derivatives",
    sourceType: "crypto-derivatives",
    sourceName: "Binance USDⓈ-M Futures",
    sourceUrl: "https://developers.binance.com/en/docs/derivatives/usds-margined-futures/market-data/rest-api",
    publishedAt: Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : new Date().toISOString(),
    symbols: [symbol],
    sectors: [],
    summary: `${symbol} on Binance Futures: latest funding rate ${(fundingRate * 100).toFixed(4)}%; open interest ${contracts.toLocaleString()} contracts. This is single-exchange derivatives data, not a market-wide measure.`,
    rawReference: { fundingRate, fundingTime: funding?.fundingTime || null, openInterest: contracts, openInterestTime: openInterest?.time || null },
    credibilityScore: 80,
    freshnessScore: 90,
    confidence: 75,
  };
}

async function fetchCryptoDerivativesEvents() {
  const results = await Promise.allSettled(SYMBOLS.map(async (symbol) => {
    const [fundingResponse, openInterestResponse] = await Promise.all([
      axios.get(`${BINANCE_FUTURES_URL}/fapi/v1/fundingRate`, { params: { symbol, limit: 1 }, timeout: 15000 }),
      axios.get(`${BINANCE_FUTURES_URL}/fapi/v1/openInterest`, { params: { symbol }, timeout: 15000 }),
    ]);
    return toCryptoDerivativesEvent(symbol, fundingResponse.data?.[0], openInterestResponse.data);
  }));
  return results.filter((result) => result.status === "fulfilled").map((result) => result.value).filter(Boolean);
}

module.exports = createUnifiedProvider(
  {
    providerId: "coinglass",
    label: "Crypto Derivatives (Binance Futures)",
    sourceType: "crypto-derivatives",
    category: "crypto",
    defaultThemes: [],
    rateLimit: { maxPerMinute: 20 },
  },
  fetchCryptoDerivativesEvents,
  { cacheTtlMs: 5 * 60 * 1000 }
);

module.exports.toCryptoDerivativesEvent = toCryptoDerivativesEvent;
