// Phase INSTITUTIONAL-AGENT-001 — "Ownership Trend": aggregates real
// current- and prior-quarter share counts across every real,
// successfully-checked manager in the disclosed cohort into one real
// trend direction. Managers whose real data couldn't be compared
// (unchecked, or missing a quarter) are honestly excluded from the sum
// rather than treated as zero.
/**
 * @param {Array<object>} managerPositions - from institutionalDataProvider
 * @returns {{ trend: "INCREASING"|"DECREASING"|"STABLE"|"UNKNOWN", currentTotalShares: number, priorTotalShares: number, comparableManagerCount: number }}
 */
function analyzeOwnershipTrend(managerPositions) {
  const comparable = managerPositions.filter((position) => position.checked && position.currentQuarter && position.priorQuarter);

  if (!comparable.length) {
    return { trend: "UNKNOWN", currentTotalShares: 0, priorTotalShares: 0, comparableManagerCount: 0 };
  }

  const currentTotalShares = comparable.reduce((sum, position) => sum + position.currentQuarter.shares, 0);
  const priorTotalShares = comparable.reduce((sum, position) => sum + position.priorQuarter.shares, 0);

  let trend = "STABLE";
  if (currentTotalShares > priorTotalShares) trend = "INCREASING";
  else if (currentTotalShares < priorTotalShares) trend = "DECREASING";

  return { trend, currentTotalShares, priorTotalShares, comparableManagerCount: comparable.length };
}

module.exports = { analyzeOwnershipTrend };
