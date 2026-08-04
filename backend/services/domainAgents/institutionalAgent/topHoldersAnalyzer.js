// Phase INSTITUTIONAL-AGENT-001 — "Top holder concentration" → "Top
// Holders". Real managers (from the disclosed cohort) currently
// holding a real, positive position, sorted by real current dollar
// value descending — never the full universe of real 13F filers, only
// this agent's disclosed cohort.
/**
 * @param {Array<object>} managerPositions - from institutionalDataProvider
 * @returns {Array<{ managerName: string, shares: number, value: number, reportDate: string|null }>}
 */
function analyzeTopHolders(managerPositions) {
  return managerPositions
    .filter((position) => position.checked && position.currentQuarter && position.currentQuarter.shares > 0)
    .map((position) => ({
      managerName: position.managerName,
      shares: position.currentQuarter.shares,
      value: position.currentQuarter.value,
      reportDate: position.currentQuarter.reportDate,
    }))
    .sort((a, b) => b.value - a.value);
}

module.exports = { analyzeTopHolders };
