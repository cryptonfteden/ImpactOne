// Phase FIBONACCI-AGENT-001 — "Price reaction history": for each real
// candidate level, honestly counts how many times real historical price
// actually touched it (came within a real tolerance band) and whether
// price subsequently stayed on the same side (a real "respected" bounce)
// or crossed through (a real "broken" level) — measured from real bars,
// never inferred or fabricated. `reactionStrength` is `null` (not 0)
// when a level was never touched, so "never tested" is never confused
// with "always broken."
const DEFAULT_TOLERANCE_RATIO = 0.005; // 0.5% of the level's own price
const DEFAULT_LOOKAHEAD_BARS = 3;

function sideOf(price, levelPrice) {
  if (price > levelPrice) return 1;
  if (price < levelPrice) return -1;
  return 0;
}

/**
 * @param {Array<object>} bars - oldest-first real bars
 * @param {Array<{ price: number }>} levels
 * @returns {Array<{ price: number, touches: number, respectedCount: number, brokenCount: number, reactionStrength: number|null }>}
 */
function analyzePriceReactionHistory(bars, levels, { toleranceRatio = DEFAULT_TOLERANCE_RATIO, lookaheadBars = DEFAULT_LOOKAHEAD_BARS } = {}) {
  if (!Array.isArray(levels)) return [];

  return levels.map((level) => {
    const price = level.price;
    if (!Number.isFinite(price)) {
      return { price, touches: 0, respectedCount: 0, brokenCount: 0, reactionStrength: null };
    }
    const tolerance = Math.abs(price) * toleranceRatio;
    let touches = 0;
    let respectedCount = 0;
    let brokenCount = 0;

    for (let i = 1; i < bars.length - lookaheadBars; i++) {
      const bar = bars[i];
      const touched = bar.low - tolerance <= price && price <= bar.high + tolerance;
      if (!touched) continue;
      touches += 1;

      const before = sideOf(bars[i - 1].close, price);
      const after = sideOf(bars[i + lookaheadBars].close, price);
      if (before !== 0 && before === after) respectedCount += 1;
      else brokenCount += 1;
    }

    return {
      price,
      touches,
      respectedCount,
      brokenCount,
      reactionStrength: touches > 0 ? respectedCount / touches : null,
    };
  });
}

module.exports = { analyzePriceReactionHistory };
