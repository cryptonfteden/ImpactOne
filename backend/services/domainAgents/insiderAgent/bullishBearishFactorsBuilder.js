// Phase INSIDER-AGENT-001 — "Bullish Factors", "Bearish Factors",
// "Risks". Every string is a deterministic template over a real,
// already-computed field — never an invented observation, never an LLM
// call. `risks` are data-quality/methodology caveats, distinct from
// bearish transaction content, the same discipline every other domain
// agent this session follows.
const MIN_TRANSACTIONS_FOR_CONFIDENCE = 5;
const MIN_FILINGS_FOR_CONFIDENCE = 3;

function formatUsd(value) {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function buildBullishFactors({ netInsiderActivity, clusterActivity, executiveActivity, transactionSize }) {
  const factors = [];
  if (netInsiderActivity.insiderActivity === "BULLISH") {
    factors.push(`Net insider activity is bullish (score ${netInsiderActivity.netInsiderScore}, ${formatUsd(netInsiderActivity.buyValue)} bought vs. ${formatUsd(netInsiderActivity.sellValue)} sold).`);
  }
  if (clusterActivity.clusterBuy) {
    factors.push(`Cluster buying detected: ${clusterActivity.distinctBuyers} distinct insiders bought within ${clusterActivity.windowDays} days.`);
  }
  if (executiveActivity.hasCeoActivity && executiveActivity.ceoTransactions.some((t) => t.transactionCode === "P")) {
    factors.push("The CEO made a real open-market purchase in this window.");
  }
  if (transactionSize.overallSignificance === "HIGH" && transactionSize.largestTransaction?.transactionCode === "P") {
    factors.push(`A high-significance real purchase was made (${formatUsd(transactionSize.largestTransaction.dollarValue)}).`);
  }
  return factors;
}

function buildBearishFactors({ netInsiderActivity, clusterActivity, executiveActivity, transactionSize }) {
  const factors = [];
  if (netInsiderActivity.insiderActivity === "BEARISH") {
    factors.push(`Net insider activity is bearish (score ${netInsiderActivity.netInsiderScore}, ${formatUsd(netInsiderActivity.sellValue)} sold vs. ${formatUsd(netInsiderActivity.buyValue)} bought).`);
  }
  if (clusterActivity.clusterSell) {
    factors.push(`Cluster selling detected: ${clusterActivity.distinctSellers} distinct insiders sold within ${clusterActivity.windowDays} days.`);
  }
  if (executiveActivity.hasCeoActivity && executiveActivity.ceoTransactions.some((t) => t.transactionCode === "S")) {
    factors.push("The CEO made a real open-market sale in this window.");
  }
  if (transactionSize.overallSignificance === "HIGH" && transactionSize.largestTransaction?.transactionCode === "S") {
    factors.push(`A high-significance real sale was made (${formatUsd(transactionSize.largestTransaction.dollarValue)}).`);
  }
  return factors;
}

function buildRisks({ transactionCount, filingsFetched, ownershipTrend }) {
  const risks = [];
  if (transactionCount < MIN_TRANSACTIONS_FOR_CONFIDENCE) {
    risks.push(`Small real sample size (${transactionCount} transaction(s)) — this read has limited statistical power.`);
  }
  if (filingsFetched < MIN_FILINGS_FOR_CONFIDENCE) {
    risks.push(`Few real Form 4 filings were available to analyze (${filingsFetched}).`);
  }
  if (ownershipTrend.trend === "DECREASING" && ownershipTrend.netOwnershipChange !== 0) {
    risks.push(`Aggregate real insider ownership decreased by ${Math.abs(Math.round(ownershipTrend.netOwnershipChange))} shares across the analyzed window.`);
  }
  return risks;
}

module.exports = { buildBullishFactors, buildBearishFactors, buildRisks, formatUsd, MIN_TRANSACTIONS_FOR_CONFIDENCE, MIN_FILINGS_FOR_CONFIDENCE };
