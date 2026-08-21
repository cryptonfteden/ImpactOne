const { createSecCompanyFactsProvider, factsFor, dedupeQuarterly, latestInstant, finite } = require("../earningsAgent/secCompanyFactsProvider");
const priceHistoryProvider = require("../../intelligence/priceHistoryProvider");

function sumLatestFour(rows) {
  const values = dedupeQuarterly(rows).slice(0, 4).map((row) => finite(row.val));
  return values.length === 4 && values.every((value) => value !== null) ? values.reduce((total, value) => total + value, 0) : null;
}

function safeDivide(top, bottom) {
  return Number.isFinite(top) && Number.isFinite(bottom) && bottom !== 0 ? top / bottom : null;
}

function createSecValuationProvider({ timeoutMs = 10000 } = {}) {
  const companyFactsProvider = createSecCompanyFactsProvider({ timeoutMs });
  async function getSymbolValuation(symbol) {
    const earnings = await companyFactsProvider.getSymbolEarnings(symbol);
    if (!earnings.dataAvailable) return { ...earnings, price: null, industry: null, eps: { trailing: null, forward: null }, epsGrowthYoY: null, revenuePerShare: null, bookValuePerShare: null, fcfPerShare: null, ebitdaPerShare: null, netDebtPerShare: null, roic: null, directRatios: { pe: null, forwardPe: null, peg: null, evEbitda: null, ps: null, pb: null, fcfYield: null } };

    // Company Facts is deliberately the accounting fallback. Price remains a
    // verified market bar and is never inferred from a filing.
    const bars = await priceHistoryProvider.getDailyBars(symbol, { range: "1mo" });
    const price = finite(bars.at(-1)?.close);
    const epsValues = earnings.epsHistory.slice(0, 4).map((row) => finite(row.actual));
    const trailingEps = epsValues.length === 4 && epsValues.every((value) => value !== null) ? epsValues.reduce((total, value) => total + value, 0) : null;
    return {
      symbol: String(symbol).toUpperCase(), asOf: earnings.asOf, sourceProvider: "SEC EDGAR Company Facts + verified market price", dataAvailable: true,
      unavailableReason: price === null ? "SEC fundamentals are available, but no verified market price is currently available." : null,
      price, industry: null, eps: { trailing: trailingEps, forward: null }, epsGrowthYoY: earnings.eps.growthYoY,
      revenuePerShare: null, bookValuePerShare: null, fcfPerShare: null, ebitdaPerShare: null, netDebtPerShare: null, roic: null,
      directRatios: { pe: safeDivide(price, trailingEps), forwardPe: null, peg: null, evEbitda: null, ps: null, pb: null, fcfYield: null },
      periodEnd: earnings.periodEnd || null,
    };
  }
  return { getSymbolValuation };
}

module.exports = { createSecValuationProvider, sumLatestFour, safeDivide };
