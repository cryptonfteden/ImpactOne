// Phase INSIDER-AGENT-001 — "Cluster buying" / "Cluster selling":
// multiple real, DISTINCT insiders (by real ownerCik, never counting
// the same person's multiple filings twice) transacting in the same
// real open-market direction within a real, disclosed time window —
// a real, well-established signal that a single insider's trade is not.
// The window anchors to the most recent real transaction date in the
// data, not "today," so a symbol with a real but slightly stale
// filing history is still evaluated on its own real timeline.
const DEFAULT_WINDOW_DAYS = 30;
const DEFAULT_MIN_DISTINCT_INSIDERS = 3;

function withinWindow(transaction, anchorMs, windowDays) {
  const transactionMs = new Date(`${transaction.transactionDate}T00:00:00Z`).getTime();
  return anchorMs - transactionMs <= windowDays * 86400000 && anchorMs - transactionMs >= 0;
}

/**
 * @param {Array<object>} transactions - real Form 4 non-derivative transactions
 * @returns {{ clusterBuy: boolean, clusterSell: boolean, distinctBuyers: number, distinctSellers: number, windowDays: number }}
 */
function analyzeClusterActivity(transactions, { windowDays = DEFAULT_WINDOW_DAYS, minDistinctInsiders = DEFAULT_MIN_DISTINCT_INSIDERS } = {}) {
  const withDates = transactions.filter((t) => t.transactionDate);
  if (!withDates.length) {
    return { clusterBuy: false, clusterSell: false, distinctBuyers: 0, distinctSellers: 0, windowDays };
  }

  const anchorMs = Math.max(...withDates.map((t) => new Date(`${t.transactionDate}T00:00:00Z`).getTime()));

  const buyersInWindow = new Set(
    withDates.filter((t) => t.transactionCode === "P" && withinWindow(t, anchorMs, windowDays)).map((t) => t.ownerCik)
  );
  const sellersInWindow = new Set(
    withDates.filter((t) => t.transactionCode === "S" && withinWindow(t, anchorMs, windowDays)).map((t) => t.ownerCik)
  );

  return {
    clusterBuy: buyersInWindow.size >= minDistinctInsiders,
    clusterSell: sellersInWindow.size >= minDistinctInsiders,
    distinctBuyers: buyersInWindow.size,
    distinctSellers: sellersInWindow.size,
    windowDays,
  };
}

module.exports = { analyzeClusterActivity, DEFAULT_WINDOW_DAYS, DEFAULT_MIN_DISTINCT_INSIDERS };
