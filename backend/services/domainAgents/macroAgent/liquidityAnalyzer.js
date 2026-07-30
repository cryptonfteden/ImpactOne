// Phase MACRO-AGENT-001 — "Liquidity conditions" → "Liquidity Score".
// Real FRED M2SL (M2 money supply) year-over-year growth mapped onto a
// disclosed 0-100 scale: 0% YoY growth (a real, historically-rare
// stagnation) floors at 25, +8% YoY (a real, historically-elevated
// expansion pace) caps at 100 — a straight linear map between those
// two disclosed anchor points, clamped to [0, 100].
const FLOOR_GROWTH = 0;
const FLOOR_SCORE = 25;
const CEILING_GROWTH = 8;
const CEILING_SCORE = 100;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * @param {{ dataAvailable: boolean, changeYoY: number|null }} liquiditySeries - from fredSeriesProvider (M2SL)
 * @returns {{ liquidityScore: number|null, m2ChangeYoY: number|null }}
 */
function analyzeLiquidity(liquiditySeries) {
  if (!liquiditySeries.dataAvailable || !Number.isFinite(liquiditySeries.changeYoY)) {
    return { liquidityScore: null, m2ChangeYoY: null };
  }

  const m2ChangeYoY = liquiditySeries.changeYoY;
  const ratio = (m2ChangeYoY - FLOOR_GROWTH) / (CEILING_GROWTH - FLOOR_GROWTH);
  const liquidityScore = Math.round(clamp(FLOOR_SCORE + ratio * (CEILING_SCORE - FLOOR_SCORE), 0, 100));

  return { liquidityScore, m2ChangeYoY };
}

module.exports = { analyzeLiquidity, FLOOR_GROWTH, FLOOR_SCORE, CEILING_GROWTH, CEILING_SCORE };
