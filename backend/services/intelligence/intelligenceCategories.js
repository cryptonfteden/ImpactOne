// Sprint 37 — Market Intelligence Source Layer, Priority 2.
//
// The canonical categories every source in the Market Intelligence Layer
// maps into. This does NOT replace the existing free-text
// provider.sourceType/category fields (CanonicalEvent.sourceType is
// already in production use and re-typing it is out of scope) — it's an
// additive normalization layer so new and old providers alike can be
// grouped consistently for the evidence matrix and console, without a
// migration touching existing rows.
const INTELLIGENCE_CATEGORIES = Object.freeze({
  MARKET_DATA: "MARKET_DATA",
  NEWS: "NEWS",
  SOCIAL_INFLUENCE: "SOCIAL_INFLUENCE",
  ANALYST_RATING: "ANALYST_RATING",
  INSTITUTIONAL: "INSTITUTIONAL",
  FUTURES_COT: "FUTURES_COT",
  CRYPTO_DERIVATIVES: "CRYPTO_DERIVATIVES",
  EQUITY_OPTIONS: "EQUITY_OPTIONS",
  TECHNICAL: "TECHNICAL",
  FUNDAMENTAL: "FUNDAMENTAL",
  RESEARCH: "RESEARCH",
});

// Maps every existing + new provider's own (sourceType, category) pair to
// exactly one canonical category. A provider not listed here falls back to
// deriveCategoryForProvider's honest "UNMAPPED" rather than a guess.
const PROVIDER_ID_TO_CATEGORY = {
  reutersBloombergWire: INTELLIGENCE_CATEGORIES.NEWS,
  sec: INTELLIGENCE_CATEGORIES.INSTITUTIONAL,
  reddit: INTELLIGENCE_CATEGORIES.SOCIAL_INFLUENCE,
  x: INTELLIGENCE_CATEGORIES.SOCIAL_INFLUENCE,
  telegram: INTELLIGENCE_CATEGORIES.SOCIAL_INFLUENCE,
  polymarket: INTELLIGENCE_CATEGORIES.RESEARCH,
  fed: INTELLIGENCE_CATEGORIES.INSTITUTIONAL,
  ecb: INTELLIGENCE_CATEGORIES.INSTITUTIONAL,
  fomc: INTELLIGENCE_CATEGORIES.INSTITUTIONAL,
  fda: INTELLIGENCE_CATEGORIES.FUNDAMENTAL,
  nasa: INTELLIGENCE_CATEGORIES.NEWS,
  usTreasury: INTELLIGENCE_CATEGORIES.INSTITUTIONAL,
  congress: INTELLIGENCE_CATEGORIES.SOCIAL_INFLUENCE,
  majorEarnings: INTELLIGENCE_CATEGORIES.FUNDAMENTAL,
  patentFeeds: INTELLIGENCE_CATEGORIES.FUNDAMENTAL,
  // Sprint 37 additions
  finviz: INTELLIGENCE_CATEGORIES.ANALYST_RATING,
  tipranks: INTELLIGENCE_CATEGORIES.ANALYST_RATING,
  zacks: INTELLIGENCE_CATEGORIES.ANALYST_RATING,
  spdr: INTELLIGENCE_CATEGORIES.INSTITUTIONAL,
  cftcCot: INTELLIGENCE_CATEGORIES.FUTURES_COT,
  coinglass: INTELLIGENCE_CATEGORIES.CRYPTO_DERIVATIVES,
  optionsFlow: INTELLIGENCE_CATEGORIES.EQUITY_OPTIONS,
  technicalAnalysis: INTELLIGENCE_CATEGORIES.TECHNICAL,
};

function deriveCategoryForProvider(providerId) {
  return PROVIDER_ID_TO_CATEGORY[providerId] || "UNMAPPED";
}

module.exports = { INTELLIGENCE_CATEGORIES, PROVIDER_ID_TO_CATEGORY, deriveCategoryForProvider };
