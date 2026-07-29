// Phase INSIDER-AGENT-001 — "Ownership Change" / "Historical insider
// trend". Uses each real insider's real, filed `sharesOwnedAfter` value
// across their own chronologically-sorted real transactions within the
// analyzed window: the change from their earliest to latest real
// reported post-transaction share count is a real, directly-filed
// figure, not a derived estimate. Aggregated across all real insiders
// in the window for one overall trend; distinct from — but built from
// the same real underlying data as — the per-owner Ownership Trend.
function groupByOwner(transactions) {
  const byOwner = new Map();
  for (const transaction of transactions) {
    if (!transaction.ownerCik || !transaction.transactionDate || !Number.isFinite(transaction.sharesOwnedAfter)) continue;
    if (!byOwner.has(transaction.ownerCik)) byOwner.set(transaction.ownerCik, []);
    byOwner.get(transaction.ownerCik).push(transaction);
  }
  return byOwner;
}

/**
 * @param {Array<object>} transactions - real Form 4 non-derivative transactions
 * @returns {{ trend: "INCREASING"|"DECREASING"|"STABLE", netOwnershipChange: number, perOwnerChanges: Array<{ ownerCik: string, ownerName: string|null, change: number }> }}
 */
function analyzeOwnershipTrend(transactions) {
  const byOwner = groupByOwner(transactions);
  const perOwnerChanges = [];

  for (const [ownerCik, ownerTransactions] of byOwner.entries()) {
    const sorted = [...ownerTransactions].sort((a, b) => (a.transactionDate < b.transactionDate ? -1 : a.transactionDate > b.transactionDate ? 1 : 0));
    const change = sorted[sorted.length - 1].sharesOwnedAfter - sorted[0].sharesOwnedAfter;
    perOwnerChanges.push({ ownerCik, ownerName: sorted[0].ownerName, change });
  }

  const netOwnershipChange = perOwnerChanges.reduce((sum, entry) => sum + entry.change, 0);

  let trend = "STABLE";
  if (netOwnershipChange > 0) trend = "INCREASING";
  else if (netOwnershipChange < 0) trend = "DECREASING";

  return { trend, netOwnershipChange, perOwnerChanges };
}

module.exports = { analyzeOwnershipTrend };
