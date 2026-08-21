// Phase INSTITUTIONAL-AGENT-001 — "Fund accumulation" / "Fund
// distribution" → "Accumulation Score" / "Distribution Score". Two
// distinct real scores (never netted into one, matching this mission's
// own separate output fields): the real reported-share increase across
// every real manager who added to their position, and the real
// reported-share decrease across every real manager who reduced or
// closed theirs — each expressed as its own real share of the total
// real repositioning activity. Both honestly report 0 when there was
// no real comparable activity at all, never a fabricated split.
function shareDelta(position) {
  if (!position.checked || !position.currentQuarter || !position.priorQuarter) return 0;
  return position.currentQuarter.shares - position.priorQuarter.shares;
}

/**
 * @param {Array<object>} managerPositions - from institutionalDataProvider
 * @returns {{ accumulationScore: number, distributionScore: number, totalIncreaseShares: number, totalDecreaseShares: number }}
 */
function analyzeAccumulationDistribution(managerPositions) {
  let totalIncreaseShares = 0;
  let totalDecreaseShares = 0;

  for (const position of managerPositions) {
    const delta = shareDelta(position);
    if (delta > 0) totalIncreaseShares += delta;
    else if (delta < 0) totalDecreaseShares += -delta;
  }

  const totalActivity = totalIncreaseShares + totalDecreaseShares;
  const accumulationScore = totalActivity > 0 ? Math.round((totalIncreaseShares / totalActivity) * 100) : 0;
  const distributionScore = totalActivity > 0 ? Math.round((totalDecreaseShares / totalActivity) * 100) : 0;

  return { accumulationScore, distributionScore, totalIncreaseShares, totalDecreaseShares, measurement: "REPORTED_SHARE_CHANGE" };
}

module.exports = { analyzeAccumulationDistribution };
