// Phase VALUATION-AGENT-001 — "Explain which metrics contributed most."
// Pure presentation over the already-computed weighted implied prices —
// no new math, just ranking and a real, checkable contribution share.
function buildSupportingMetrics(contributingMethods) {
  if (!contributingMethods.length) return [];
  const totalWeight = contributingMethods.reduce((sum, entry) => sum + entry.weight, 0);
  return [...contributingMethods]
    .map((entry) => ({
      method: entry.method,
      impliedPrice: entry.impliedPrice,
      weight: entry.weight,
      contributionPercent: totalWeight > 0 ? Math.round((entry.weight / totalWeight) * 100) : 0,
    }))
    .sort((a, b) => b.contributionPercent - a.contributionPercent);
}

module.exports = { buildSupportingMetrics };
