// Phase ANALYST-CONSENSUS-AGENT-001 — "Analyst conviction" →
// "Conviction Score" (0-100). A real, disclosed proxy: the proportion
// of the latest real Finnhub period's ratings that are the EXTREME
// buckets (strongBuy + strongSell) out of the real total — analysts
// choosing a strong/extreme rating rather than a moderate one (buy/
// hold/sell) reflects real higher conviction, regardless of direction.
/**
 * @param {{strongBuy:number, buy:number, hold:number, sell:number, strongSell:number}|null} latestPeriod
 * @returns {{ convictionScore: number|null }}
 */
function analyzeConviction(latestPeriod) {
  if (!latestPeriod) return { convictionScore: null };

  const totalAnalysts = latestPeriod.strongBuy + latestPeriod.buy + latestPeriod.hold + latestPeriod.sell + latestPeriod.strongSell;
  if (!totalAnalysts) return { convictionScore: null };

  const extremeCount = latestPeriod.strongBuy + latestPeriod.strongSell;
  const convictionScore = Math.round((extremeCount / totalAnalysts) * 100);

  return { convictionScore };
}

module.exports = { analyzeConviction };
