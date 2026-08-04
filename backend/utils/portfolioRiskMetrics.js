// Backend port of frontend/src/utils/dashboardMetrics.js's
// computeDiversification/computeRiskScore — same formulas, same inputs, so
// the autonomous recommendation engine's risk read matches what the
// Sprint 15 Portfolio Risk Panel already shows the user. Duplicated rather
// than cross-imported: backend is CommonJS, the frontend module is ESM, and
// they're separate npm packages.

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function computeDiversification(allocationBySector = []) {
  if (!allocationBySector.length) {
    return { largestSector: null, largestWeightPct: 0, diversificationScore: 100 };
  }

  const largest = [...allocationBySector].sort((a, b) => Number(b.pct || 0) - Number(a.pct || 0))[0];
  const largestWeightPct = Number(largest.pct || 0);

  return {
    largestSector: largest.name,
    largestWeightPct: Math.round(largestWeightPct),
    diversificationScore: clamp(Math.round(100 - largestWeightPct), 0, 100),
  };
}

function computeRiskScore({ positionsValue = 0, totalValue = 0, largestSectorWeightPct = 0, macroRegime = null }) {
  const exposurePct = totalValue > 0 ? (positionsValue / totalValue) * 100 : 0;
  const concentrationPenalty = Math.max(0, largestSectorWeightPct - 25);
  const recessionPenalty = macroRegime?.recessionRisk === "high" ? 15 : macroRegime?.recessionRisk === "medium" ? 5 : 0;
  const inflationPenalty = macroRegime?.inflationPressure === "high" ? 10 : macroRegime?.inflationPressure === "moderate" ? 3 : 0;

  const raw = exposurePct * 0.5 + concentrationPenalty * 0.5 + recessionPenalty + inflationPenalty;
  return clamp(Math.round(raw), 0, 100);
}

function riskLevelLabel(riskScore) {
  if (riskScore >= 70) return "High";
  if (riskScore >= 40) return "Moderate";
  return "Low";
}

module.exports = {
  clamp,
  computeDiversification,
  computeRiskScore,
  riskLevelLabel,
};
