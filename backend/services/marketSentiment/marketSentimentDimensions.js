// Phase AI-ENGINE-002.1 — Market Sentiment Engine foundation. Every
// constant in this file is grounded in the real-data audit performed
// before this phase (MARKET_SENTIMENT_ENGINE.md §3) — nothing here
// pretends a data source exists that doesn't.

// All 8 dimensions the approved architecture names, plus the OVERALL
// rollup row — the full intended model. Six are implemented from
// identified real inputs; the remaining two are never fabricated.
const ALL_DIMENSIONS = [
  "NEWS_SENTIMENT",
  "AI_RECOMMENDATION_DISTRIBUTION",
  "MARKET_BREADTH",
  "FEAR_GREED",
  "VOLATILITY",
  "SECTOR_ROTATION",
  "MACRO_EVENTS",
  "EARNINGS_TREND",
];

const IMPLEMENTED_DIMENSIONS = ["NEWS_SENTIMENT", "AI_RECOMMENDATION_DISTRIBUTION", "MARKET_BREADTH", "FEAR_GREED", "VOLATILITY", "MACRO_EVENTS"];

// Reasons are permanent, disclosed gaps (MARKET_SENTIMENT_ENGINE.md §3),
// not transient errors — these dimensions always report
// unavailable in this phase, by design.
const NOT_YET_IMPLEMENTED_REASONS = {
  SECTOR_ROTATION: "No relative-strength/rotation computation exists — only per-event sector tagging (autonomousMarketService.js's sectorPropagation), which is a different, unrelated concept per architecture §3/§5d.",
  EARNINGS_TREND: "No live earnings-beat/miss data source is connected — earningsProvider.js is an honest stub.",
};

const MARKETS = ["US", "EUROPE", "CHINA", "JAPAN", "INDIA", "CRYPTO", "COMMODITIES", "ENERGY"];

// Every market's real, disclosed data-availability scope. `macroRelevant`
// is true only where a real macro data source exists — FRED is a US
// Federal Reserve series and CFTC COT covers US-listed futures
// (gold/silver/crude/USD index/Nasdaq mini), so FEAR_GREED/MACRO_EVENTS
// are honestly scoped to US/COMMODITIES/ENERGY only (no ECB/BOJ/PBOC/RBI
// data source exists in this codebase — MARKET_SENTIMENT_ENGINE.md §3).
// `proxySymbols` are the real-price-history universe VOLATILITY uses per
// market (technicalIntelligenceService.analyzeSymbol) — reusing the same
// bounded-universe discipline the rest of this platform already applies
// (never a second hardcoded "all US equities"-style universe).
const MARKET_REGISTRY = {
  US: { proxySymbols: ["SPY", "QQQ", "DIA", "IWM", "RSP"], regionTags: ["united states", "u.s.", "usa", "america"], cotMarketQuery: "NASDAQ MINI", macroRelevant: true, recommendationEligible: true },
  EUROPE: { proxySymbols: ["VGK"], regionTags: ["europe", "eu", "eurozone", "germany", "france", "uk", "britain"], cotMarketQuery: null, macroRelevant: false, recommendationEligible: false },
  CHINA: { proxySymbols: ["FXI"], regionTags: ["china"], cotMarketQuery: null, macroRelevant: false, recommendationEligible: false },
  JAPAN: { proxySymbols: ["EWJ"], regionTags: ["japan"], cotMarketQuery: null, macroRelevant: false, recommendationEligible: false },
  INDIA: { proxySymbols: ["INDA"], regionTags: ["india"], cotMarketQuery: null, macroRelevant: false, recommendationEligible: false },
  CRYPTO: { proxySymbols: ["BTC-USD"], regionTags: ["crypto", "bitcoin", "ethereum"], cotMarketQuery: null, macroRelevant: false, recommendationEligible: false },
  COMMODITIES: { proxySymbols: ["DBC", "GLD"], regionTags: ["commodities", "gold", "silver"], cotMarketQuery: "GOLD", macroRelevant: true, recommendationEligible: false },
  ENERGY: { proxySymbols: ["XLE"], regionTags: ["energy", "oil", "gas"], cotMarketQuery: "CRUDE OIL", macroRelevant: true, recommendationEligible: false },
};

const METHODOLOGY_VERSION = "sentiment-engine-v1";

// Rollup enforcement constants (mission §3) — see marketSentimentRollup.js.
const MIN_CONTRIBUTOR_BREADTH = 2;
const MAX_SINGLE_DIMENSION_WEIGHT = 0.4;
const TOTAL_DIMENSION_COUNT = ALL_DIMENSIONS.length; // 8 — the full intended model, not just what's implemented (architecture §6)

function isValidMarket(market) {
  return MARKETS.includes(market);
}

module.exports = {
  ALL_DIMENSIONS,
  IMPLEMENTED_DIMENSIONS,
  NOT_YET_IMPLEMENTED_REASONS,
  MARKETS,
  MARKET_REGISTRY,
  METHODOLOGY_VERSION,
  MIN_CONTRIBUTOR_BREADTH,
  MAX_SINGLE_DIMENSION_WEIGHT,
  TOTAL_DIMENSION_COUNT,
  isValidMarket,
};
