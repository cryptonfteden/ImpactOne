// Phase VALUATION-AGENT-001 — implements FAIR_VALUE_METHODOLOGY.md §1.3's
// "weight and combine the usable implied prices" step. Pure function.
// Never a simple unweighted average — uses the company's own
// profile-appropriate weight table (profileWeighting.js).
function combineImpliedPrices(impliedPrices, weights) {
  const weighted = impliedPrices
    .map((entry) => ({ ...entry, weight: weights[entry.method] ?? 0 }))
    .filter((entry) => entry.weight > 0);

  if (!weighted.length) {
    return { fairValueEstimate: null, fairValueRange: null, contributingMethods: [] };
  }

  const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  const fairValueEstimate = weighted.reduce((sum, entry) => sum + entry.impliedPrice * entry.weight, 0) / totalWeight;

  const prices = weighted.map((entry) => entry.impliedPrice);
  const fairValueRange = { low: Math.min(...prices), high: Math.max(...prices) };

  return { fairValueEstimate, fairValueRange, contributingMethods: weighted };
}

/**
 * @returns {number|null} - positive means undervalued (price below fair value), negative means overvalued
 */
function computeDiscountToFairValue(fairValueEstimate, currentPrice) {
  if (!Number.isFinite(fairValueEstimate) || fairValueEstimate <= 0 || !Number.isFinite(currentPrice)) return null;
  return (fairValueEstimate - currentPrice) / fairValueEstimate;
}

module.exports = { combineImpliedPrices, computeDiscountToFairValue };
