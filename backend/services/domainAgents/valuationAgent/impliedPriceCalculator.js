// Phase VALUATION-AGENT-001 — implements FAIR_VALUE_METHODOLOGY.md §1.2's
// exact implied-fair-price formulas. Pure functions, no I/O. Every
// formula applies the SECTOR-relative target multiple (never the
// company's own current multiple, which would be circular — "fair price
// = current multiple × current EPS" always just returns the current
// price) to the company's own real fundamental.
const { determineApplicableMethods } = require("./negativeEarningsHandler");

/**
 * @param {import("./valuationDataProvider").ValuationMetrics} metrics
 * @param {import("./peerGroupProvider").SectorReference} sectorReference
 * @returns {{ impliedPrices: Array<{method: string, impliedPrice: number}>, excludedMethods: Array<{method: string, reason: string}> }}
 */
function computeImpliedPrices(metrics, sectorReference) {
  const { applicableMethods, excludedMethods } = determineApplicableMethods(metrics);
  const multiples = sectorReference.multiples;
  const impliedPrices = [];

  function tryAdd(method, computeFn, missingReason) {
    if (!applicableMethods.includes(method)) return;
    const value = computeFn();
    if (Number.isFinite(value) && value > 0) {
      impliedPrices.push({ method, impliedPrice: value });
    } else {
      excludedMethods.push({ method, reason: missingReason });
    }
  }

  tryAdd("PE", () => (Number.isFinite(multiples.pe) ? multiples.pe * metrics.eps.trailing : null), "No sector-relative P/E reference multiple is available.");

  tryAdd("FORWARD_PE", () => (Number.isFinite(multiples.forwardPe) ? multiples.forwardPe * metrics.eps.forward : null), "No sector-relative Forward P/E reference multiple is available.");

  tryAdd(
    "PEG",
    () => (Number.isFinite(multiples.peg) ? multiples.peg * metrics.epsGrowthYoY * metrics.eps.trailing : null),
    "No sector-relative PEG reference multiple is available."
  );

  tryAdd(
    "EV_EBITDA",
    () => {
      if (!Number.isFinite(multiples.evEbitda)) return null;
      const impliedEnterpriseValuePerShare = multiples.evEbitda * metrics.ebitdaPerShare;
      const netDebtPerShare = Number.isFinite(metrics.netDebtPerShare) ? metrics.netDebtPerShare : 0;
      return impliedEnterpriseValuePerShare - netDebtPerShare;
    },
    "No sector-relative EV/EBITDA reference multiple is available."
  );

  tryAdd("PS", () => (Number.isFinite(multiples.ps) ? multiples.ps * metrics.revenuePerShare : null), "No sector-relative Price/Sales reference multiple is available.");

  tryAdd("PB", () => (Number.isFinite(multiples.pb) ? multiples.pb * metrics.bookValuePerShare : null), "No sector-relative Price/Book reference multiple is available.");

  tryAdd(
    "FCF_YIELD",
    () => (Number.isFinite(multiples.fcfYield) && multiples.fcfYield > 0 ? metrics.fcfPerShare / (multiples.fcfYield / 100) : null),
    "No sector-relative FCF Yield reference is available."
  );

  return { impliedPrices, excludedMethods };
}

module.exports = { computeImpliedPrices };
