// Phase SHORT-INTEREST-AGENT-001 — "Short squeeze probability". A
// disclosed, hand-set weighted combination (never a naive average) of
// the real crowdedness score (60% weight — how elevated real recent
// short-selling volume is) and real recent price momentum (40% weight
// — a real price rise despite real elevated short-volume activity is
// the classic real squeeze setup; a real price fall is not). When real
// price data isn't available, this honestly falls back to a neutral
// midpoint contribution for that half, never fabricating a real price
// move, and discloses `priceDataUsed: false` so confidence can account
// for it.
const CROWDEDNESS_WEIGHT = 0.6;
const PRICE_MOMENTUM_WEIGHT_MAX = 40; // the other 40 points of the 0-100 scale
const PRICE_MOMENTUM_CLAMP_PERCENT = 10; // a real ±10% recent price move fully saturates this component

/**
 * @param {number} crowdednessScore - 0-100, from crowdednessAnalyzer
 * @param {number|null} priceChangePercent - real recent price % change, or null if unavailable
 * @returns {{ squeezeProbability: number, priceDataUsed: boolean }}
 */
function analyzeSqueezeProbability(crowdednessScore, priceChangePercent) {
  const priceDataUsed = Number.isFinite(priceChangePercent);
  const clampedPrice = priceDataUsed ? Math.max(-PRICE_MOMENTUM_CLAMP_PERCENT, Math.min(PRICE_MOMENTUM_CLAMP_PERCENT, priceChangePercent)) : 0;
  const priceMomentumFactor = ((clampedPrice + PRICE_MOMENTUM_CLAMP_PERCENT) / (2 * PRICE_MOMENTUM_CLAMP_PERCENT)) * PRICE_MOMENTUM_WEIGHT_MAX;

  const squeezeProbability = Math.round(Math.max(0, Math.min(100, crowdednessScore * CROWDEDNESS_WEIGHT + priceMomentumFactor)));

  return { squeezeProbability, priceDataUsed };
}

module.exports = { analyzeSqueezeProbability, CROWDEDNESS_WEIGHT, PRICE_MOMENTUM_WEIGHT_MAX, PRICE_MOMENTUM_CLAMP_PERCENT };
