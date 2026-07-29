// Phase SHORT-INTEREST-AGENT-001 — overall "Confidence" (0-100), a
// disclosed, hand-set weighted formula (never a naive average): data
// availability (30 pts), real sample size — how many real trading
// days of FINRA short-volume data were actually found (up to 25 pts)
// — whether a real trend could be computed at all (15 pts), whether
// real price data was available for the squeeze-probability read (15
// pts), and a fixed, disclosed penalty (10 pts) for this agent's
// permanent scope limitation: no real securities-lending (borrow
// fee/utilization) data source exists in this environment.
const BASE_AVAILABLE = 30;
const MAX_SAMPLE_BONUS = 25;
const SAMPLE_CAP_DAYS = 15;
const TREND_KNOWN_BONUS = 15;
const PRICE_DATA_BONUS = 15;
const STRUCTURAL_PENALTY = 10;

/**
 * @param {{ dataAvailable: boolean, daysCount: number, trendKnown: boolean, priceDataUsed: boolean }} params
 * @returns {{ confidence: number, components: object }}
 */
function computeConfidence({ dataAvailable, daysCount, trendKnown, priceDataUsed }) {
  if (!dataAvailable) {
    return { confidence: 0, components: { base: 0, sampleBonus: 0, trendBonus: 0, priceDataBonus: 0, structuralPenalty: 0 } };
  }

  const base = BASE_AVAILABLE;
  const sampleBonus = Math.round((Math.min(daysCount, SAMPLE_CAP_DAYS) / SAMPLE_CAP_DAYS) * MAX_SAMPLE_BONUS);
  const trendBonus = trendKnown ? TREND_KNOWN_BONUS : 0;
  const priceDataBonus = priceDataUsed ? PRICE_DATA_BONUS : 0;
  const structuralPenalty = STRUCTURAL_PENALTY;

  const confidence = Math.round(Math.max(0, Math.min(100, base + sampleBonus + trendBonus + priceDataBonus - structuralPenalty)));

  return { confidence, components: { base, sampleBonus, trendBonus, priceDataBonus, structuralPenalty } };
}

module.exports = { computeConfidence };
