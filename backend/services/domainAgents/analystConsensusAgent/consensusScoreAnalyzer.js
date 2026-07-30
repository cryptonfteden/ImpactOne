// Phase ANALYST-CONSENSUS-AGENT-001 — "Analyst ratings" + "Analyst
// coverage" → "Consensus Score" (and the real analyst-count total this
// agent's other analyzers key off of). A disclosed weighted formula
// over the real, most-recent Finnhub rating-trend period: strongBuy/
// strongSell carry double weight relative to buy/sell (a stronger real
// conviction rating), never a naive average of the five bucket counts.
const STRONG_WEIGHT = 2;
const REGULAR_WEIGHT = 1;

function emptyResult() {
  return { consensusScore: null, totalAnalysts: 0, latestPeriod: null };
}

/**
 * @param {{strongBuy:number, buy:number, hold:number, sell:number, strongSell:number}} period
 * @returns {number} a real weighted score in -100..100
 */
function computeWeightedScore(period) {
  const totalAnalysts = period.strongBuy + period.buy + period.hold + period.sell + period.strongSell;
  if (!totalAnalysts) return null;
  const weightedSum = period.strongBuy * STRONG_WEIGHT + period.buy * REGULAR_WEIGHT - period.sell * REGULAR_WEIGHT - period.strongSell * STRONG_WEIGHT;
  const maxPossible = totalAnalysts * STRONG_WEIGHT;
  return Math.round((weightedSum / maxPossible) * 100);
}

/**
 * @param {Array<{period:string, strongBuy:number, buy:number, hold:number, sell:number, strongSell:number}>} periods - oldest-first
 * @returns {{ consensusScore: number|null, totalAnalysts: number, latestPeriod: object|null }}
 */
function analyzeConsensusScore(periods) {
  if (!periods.length) return emptyResult();

  const latestPeriod = periods[periods.length - 1];
  const totalAnalysts = latestPeriod.strongBuy + latestPeriod.buy + latestPeriod.hold + latestPeriod.sell + latestPeriod.strongSell;
  const consensusScore = computeWeightedScore(latestPeriod);

  return { consensusScore, totalAnalysts, latestPeriod };
}

module.exports = { analyzeConsensusScore, computeWeightedScore, STRONG_WEIGHT, REGULAR_WEIGHT };
