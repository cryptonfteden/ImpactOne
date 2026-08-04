// Phase INSIDER-AGENT-001 — "Transaction size" / "Transaction
// Significance". Real dollar value per real open-market transaction,
// classified into disclosed, hand-set tiers. Only P/S transactions
// with a real, finite price-per-share are sized — grants/exercises/
// gifts and any transaction EDGAR didn't report a real price for are
// honestly excluded from sizing, never assigned a fabricated value.
const { dollarValue } = require("./netInsiderActivityAnalyzer");

const HIGH_SIGNIFICANCE_THRESHOLD = 1_000_000;
const MODERATE_SIGNIFICANCE_THRESHOLD = 100_000;

function tierOf(value) {
  if (value >= HIGH_SIGNIFICANCE_THRESHOLD) return "HIGH";
  if (value >= MODERATE_SIGNIFICANCE_THRESHOLD) return "MODERATE";
  return "LOW";
}

/**
 * @param {Array<object>} transactions - real Form 4 non-derivative transactions
 * @returns {{ overallSignificance: "NONE"|"LOW"|"MODERATE"|"HIGH", largestTransaction: object|null, totalDollarVolume: number }}
 */
function analyzeTransactionSize(transactions) {
  const sizable = transactions
    .filter((t) => t.transactionCode === "P" || t.transactionCode === "S")
    .map((t) => ({ ...t, dollarValue: dollarValue(t) }))
    .filter((t) => Number.isFinite(t.dollarValue));

  if (!sizable.length) {
    return { overallSignificance: "NONE", largestTransaction: null, totalDollarVolume: 0 };
  }

  const totalDollarVolume = Math.round(sizable.reduce((sum, t) => sum + t.dollarValue, 0) * 100) / 100;
  const largestTransaction = sizable.reduce((largest, t) => (t.dollarValue > largest.dollarValue ? t : largest), sizable[0]);

  return { overallSignificance: tierOf(largestTransaction.dollarValue), largestTransaction, totalDollarVolume };
}

module.exports = { analyzeTransactionSize, tierOf, HIGH_SIGNIFICANCE_THRESHOLD, MODERATE_SIGNIFICANCE_THRESHOLD };
