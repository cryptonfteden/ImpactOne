// Sprint 37 Priority 5 — Analyst Consensus Cross-Check.
//
// SAFETY-CRITICAL: this module never creates a recommendation. It
// normalizes each provider's own rating vocabulary onto one 1-5 scale so
// they're comparable, then explicitly detects disagreement rather than
// averaging providers into false certainty — the mission's own worked
// example (Finviz Strong Buy + Zacks Hold + TipRanks Moderate Buy) must
// remain visible disagreement, not a blended "Buy."
const RATING_SCALE = Object.freeze({
  STRONG_SELL: 1,
  SELL: 2,
  HOLD: 3,
  BUY: 4,
  STRONG_BUY: 5,
});

// Each provider's own vocabulary maps onto the canonical scale — the
// mapping is explicit and inspectable per provider, never assumed
// universal. A provider's rating that isn't in its own map is honestly
// UNRECOGNIZED rather than guessed.
const PROVIDER_VOCABULARIES = {
  finviz: { "Strong Buy": RATING_SCALE.STRONG_BUY, "Buy": RATING_SCALE.BUY, "Hold": RATING_SCALE.HOLD, "Sell": RATING_SCALE.SELL, "Strong Sell": RATING_SCALE.STRONG_SELL },
  tipranks: { "Strong Buy": RATING_SCALE.STRONG_BUY, "Moderate Buy": RATING_SCALE.BUY, "Hold": RATING_SCALE.HOLD, "Moderate Sell": RATING_SCALE.SELL, "Strong Sell": RATING_SCALE.STRONG_SELL },
  zacks: { "Strong Buy": RATING_SCALE.STRONG_BUY, "Buy": RATING_SCALE.BUY, "Hold": RATING_SCALE.HOLD, "Sell": RATING_SCALE.SELL, "Strong Sell": RATING_SCALE.STRONG_SELL },
};

const DISAGREEMENT_THRESHOLD = 2; // a 2+ point spread on the 1-5 scale is a real, visible disagreement

function normalizeRating(providerId, rawRating, extra = {}) {
  const vocabulary = PROVIDER_VOCABULARIES[providerId];
  const scaleValue = vocabulary?.[rawRating];

  return {
    providerId,
    rawRating,
    scaleValue: Number.isFinite(scaleValue) ? scaleValue : null,
    recognized: Number.isFinite(scaleValue),
    priceTarget: Number.isFinite(extra.priceTarget) ? extra.priceTarget : null,
    priorPriceTarget: Number.isFinite(extra.priorPriceTarget) ? extra.priorPriceTarget : null,
    targetRevision: Number.isFinite(extra.priceTarget) && Number.isFinite(extra.priorPriceTarget)
      ? { direction: extra.priceTarget > extra.priorPriceTarget ? "RAISED" : extra.priceTarget < extra.priorPriceTarget ? "LOWERED" : "UNCHANGED", amount: extra.priceTarget - extra.priorPriceTarget }
      : null,
    estimateRevision: extra.estimateRevision || null,
    analystCount: Number.isFinite(extra.analystCount) ? extra.analystCount : null,
    ratingDate: extra.ratingDate || null,
    freshnessDays: extra.ratingDate ? Math.floor((Date.now() - new Date(extra.ratingDate).getTime()) / 86400000) : null,
  };
}

/**
 * Cross-source disagreement detection — the mission's core requirement.
 * Never returns an averaged "consensus score"; returns the real spread
 * and flags disagreement explicitly when the recognized ratings' scale
 * values span >= DISAGREEMENT_THRESHOLD.
 */
function crossCheckRatings(normalizedRatings = []) {
  const recognized = normalizedRatings.filter((rating) => rating.recognized);
  if (recognized.length < 2) {
    return { hasEnoughData: recognized.length > 0, disagreement: false, spread: null, ratings: normalizedRatings };
  }

  const values = recognized.map((rating) => rating.scaleValue);
  const spread = Math.max(...values) - Math.min(...values);

  return {
    hasEnoughData: true,
    disagreement: spread >= DISAGREEMENT_THRESHOLD,
    spread,
    highRating: recognized.find((rating) => rating.scaleValue === Math.max(...values)),
    lowRating: recognized.find((rating) => rating.scaleValue === Math.min(...values)),
    ratings: normalizedRatings,
    isRecommendation: false,
  };
}

// Sprint 37 — Finviz/TipRanks/Zacks all require either a paid API tier or
// scraping their site (against ToS for automated use without a license).
// No credential exists in this environment. Fixture demonstration only,
// using the mission's own worked disagreement example verbatim, so the
// disagreement-detection logic is exercised against a realistic case.
function getFixtureConsensus(symbol = "AAPL") {
  const ratings = [
    normalizeRating("finviz", "Strong Buy", { priceTarget: 250, priorPriceTarget: 230, analystCount: 32, ratingDate: new Date().toISOString() }),
    normalizeRating("zacks", "Hold", { priceTarget: 210, priorPriceTarget: 210, analystCount: 18, ratingDate: new Date().toISOString() }),
    normalizeRating("tipranks", "Moderate Buy", { priceTarget: 230, priorPriceTarget: 225, analystCount: 27, ratingDate: new Date().toISOString() }),
  ];
  return { symbol, status: "FIXTURE", ...crossCheckRatings(ratings) };
}

module.exports = { RATING_SCALE, PROVIDER_VOCABULARIES, normalizeRating, crossCheckRatings, getFixtureConsensus, DISAGREEMENT_THRESHOLD };
