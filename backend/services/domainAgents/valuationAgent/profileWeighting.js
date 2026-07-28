// Phase VALUATION-AGENT-001 — implements FAIR_VALUE_METHODOLOGY.md §1.3's
// weighting table. Disclosed, hand-set weights (never a fitted/opaque
// model), varying by the company's own real profile — never a single
// unweighted average across all usable methods.
const ASSET_HEAVY_INDUSTRY_KEYWORDS = ["bank", "insurance", "financial", "reit", "real estate"];

function classifyProfile(metrics) {
  const industry = (metrics.industry || "").toLowerCase();
  const isAssetHeavy = ASSET_HEAVY_INDUSTRY_KEYWORDS.some((keyword) => industry.includes(keyword));
  if (isAssetHeavy) return "ASSET_HEAVY";

  const isUnprofitable = !Number.isFinite(metrics.eps.trailing) || metrics.eps.trailing <= 0;
  if (isUnprofitable) return "UNPROFITABLE";

  return "PROFITABLE_STABLE";
}

const WEIGHT_TABLES = {
  PROFITABLE_STABLE: { PE: 1.0, FORWARD_PE: 1.0, PEG: 1.0, EV_EBITDA: 1.0, FCF_YIELD: 1.0, PS: 0.5, PB: 0.5 },
  UNPROFITABLE: { PE: 0, FORWARD_PE: 1.0, PEG: 0, EV_EBITDA: 1.0, FCF_YIELD: 1.0, PS: 1.5, PB: 0.5 },
  ASSET_HEAVY: { PE: 1.0, FORWARD_PE: 1.0, PEG: 1.0, EV_EBITDA: 0.3, FCF_YIELD: 1.0, PS: 0.5, PB: 1.5 },
};

/**
 * @param {import("./valuationDataProvider").ValuationMetrics} metrics
 * @returns {{ profile: string, weights: Record<string, number> }}
 */
function getProfileWeights(metrics) {
  const profile = classifyProfile(metrics);
  return { profile, weights: WEIGHT_TABLES[profile] };
}

module.exports = { getProfileWeights, classifyProfile, WEIGHT_TABLES, ASSET_HEAVY_INDUSTRY_KEYWORDS };
