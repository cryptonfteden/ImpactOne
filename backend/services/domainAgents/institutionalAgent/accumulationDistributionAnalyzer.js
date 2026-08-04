// Phase INSTITUTIONAL-AGENT-001 — "Fund accumulation" / "Fund
// distribution" → "Accumulation Score" / "Distribution Score". Two
// distinct real scores (never netted into one, matching this mission's
// own separate output fields): the real dollar-value increase across
// every real manager who added to their position, and the real
// dollar-value decrease across every real manager who reduced or
// closed theirs — each expressed as its own real share of the total
// real repositioning activity. Both honestly report 0 when there was
// no real comparable activity at all, never a fabricated split.
function dollarDelta(position) {
  if (!position.checked || !position.currentQuarter || !position.priorQuarter) return 0;
  return position.currentQuarter.value - position.priorQuarter.value;
}

/**
 * @param {Array<object>} managerPositions - from institutionalDataProvider
 * @returns {{ accumulationScore: number, distributionScore: number, totalIncreaseValue: number, totalDecreaseValue: number }}
 */
function analyzeAccumulationDistribution(managerPositions) {
  let totalIncreaseValue = 0;
  let totalDecreaseValue = 0;

  for (const position of managerPositions) {
    const delta = dollarDelta(position);
    if (delta > 0) totalIncreaseValue += delta;
    else if (delta < 0) totalDecreaseValue += -delta;
  }

  const totalActivity = totalIncreaseValue + totalDecreaseValue;
  const accumulationScore = totalActivity > 0 ? Math.round((totalIncreaseValue / totalActivity) * 100) : 0;
  const distributionScore = totalActivity > 0 ? Math.round((totalDecreaseValue / totalActivity) * 100) : 0;

  return { accumulationScore, distributionScore, totalIncreaseValue, totalDecreaseValue };
}

module.exports = { analyzeAccumulationDistribution };
