// Phase MACRO-AGENT-001 — "VIX" (and credit spreads) → "Market Stress".
// Real VIX close level (disclosed thresholds: <15 calm, 15-20 moderate,
// 20-30 elevated, >30 high — all real, widely-cited VIX regime
// boundaries) combined with the real credit-spread classification from
// creditSpreadAnalyzer.js — the WORSE of the two real signals wins,
// since either a real vol spike or real credit stress alone is enough
// to constitute genuine market stress.
const STRESS_RANK = { LOW: 0, MODERATE: 1, ELEVATED: 2, HIGH: 3 };
const CREDIT_TO_STRESS_RANK = { TIGHT: 0, NORMAL: 1, WIDE: 2, STRESSED: 3 };
const RANK_TO_STRESS = ["LOW", "MODERATE", "ELEVATED", "HIGH"];

function classifyVix(vixLevel) {
  if (vixLevel < 15) return "LOW";
  if (vixLevel < 20) return "MODERATE";
  if (vixLevel < 30) return "ELEVATED";
  return "HIGH";
}

/**
 * @param {{ dataAvailable: boolean, latestClose: number|null }} vixProxy - from marketProxyProvider ("^VIX")
 * @param {{ classification: string }} creditSpreadResult - from creditSpreadAnalyzer.analyzeCreditSpread
 * @returns {{ marketStress: "LOW"|"MODERATE"|"ELEVATED"|"HIGH"|"UNKNOWN", vixLevel: number|null, vixClassification: string|null }}
 */
function analyzeMarketStress(vixProxy, creditSpreadResult) {
  const vixAvailable = vixProxy.dataAvailable && Number.isFinite(vixProxy.latestClose);
  const creditAvailable = creditSpreadResult.classification !== "UNKNOWN";

  if (!vixAvailable && !creditAvailable) {
    return { marketStress: "UNKNOWN", vixLevel: null, vixClassification: null };
  }

  const vixClassification = vixAvailable ? classifyVix(vixProxy.latestClose) : null;
  const vixRank = vixClassification ? STRESS_RANK[vixClassification] : -1;
  const creditRank = creditAvailable ? CREDIT_TO_STRESS_RANK[creditSpreadResult.classification] : -1;

  const marketStress = RANK_TO_STRESS[Math.max(vixRank, creditRank)];

  return {
    marketStress,
    vixLevel: vixAvailable ? vixProxy.latestClose : null,
    vixClassification,
  };
}

module.exports = { analyzeMarketStress, classifyVix };
