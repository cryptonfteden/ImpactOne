// Phase INSIDER-AGENT-001 — "Officer vs Director Activity". Tallies
// real open-market (P/S) transaction counts and dollar volumes by real
// reporting-owner role flags. A real insider who is both an officer AND
// a director (common — many named executive officers also sit on the
// board) is honestly counted in both buckets, never forced into a
// single role.
const { dollarValue } = require("./netInsiderActivityAnalyzer");

function tally(transactions) {
  const buys = transactions.filter((t) => t.transactionCode === "P");
  const sells = transactions.filter((t) => t.transactionCode === "S");
  return {
    buyCount: buys.length,
    sellCount: sells.length,
    buyValue: Math.round(buys.reduce((sum, t) => sum + (dollarValue(t) || 0), 0) * 100) / 100,
    sellValue: Math.round(sells.reduce((sum, t) => sum + (dollarValue(t) || 0), 0) * 100) / 100,
  };
}

/**
 * @param {Array<object>} transactions - real Form 4 non-derivative transactions
 * @returns {{ officer: object, director: object, tenPercentOwner: object }}
 */
function analyzeOfficerDirectorActivity(transactions) {
  return {
    officer: tally(transactions.filter((t) => t.isOfficer)),
    director: tally(transactions.filter((t) => t.isDirector)),
    tenPercentOwner: tally(transactions.filter((t) => t.isTenPercentOwner)),
  };
}

module.exports = { analyzeOfficerDirectorActivity };
