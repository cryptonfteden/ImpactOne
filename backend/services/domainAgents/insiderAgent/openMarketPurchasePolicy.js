const ACTIONABLE_MAX_AGE_DAYS = 7;

function isFinitePositive(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0;
}

function isVerifiedOpenMarketPurchase(transaction) {
  return String(transaction?.transactionCode || "").toUpperCase() === "P"
    && String(transaction?.acquiredDisposedCode || "").toUpperCase() === "A"
    && isFinitePositive(transaction?.shares)
    && isFinitePositive(transaction?.pricePerShare)
    && Boolean(transaction?.transactionDate)
    && Boolean(transaction?.filingUrl)
    && Boolean(transaction?.ownerCik || transaction?.ownerName);
}

function dateAgeDays(dateString, now = new Date()) {
  if (!dateString) return null;
  const timestamp = new Date(`${dateString}T00:00:00Z`).getTime();
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, Math.floor((now.getTime() - timestamp) / 86400000));
}

function summarizeVerifiedPurchases(transactions = [], { now = new Date() } = {}) {
  const purchases = transactions.filter(isVerifiedOpenMarketPurchase);
  const shares = purchases.reduce((sum, item) => sum + Number(item.shares), 0);
  const value = purchases.reduce((sum, item) => sum + Number(item.shares) * Number(item.pricePerShare), 0);
  const buyers = new Set(purchases.map((item) => item.ownerCik || item.ownerName));
  const filings = new Set(purchases.map((item) => item.filingUrl));
  const latestDate = purchases.reduce(
    (latest, item) => (!latest || item.transactionDate > latest ? item.transactionDate : latest),
    null
  );
  const ageDays = dateAgeDays(latestDate, now);

  return {
    purchases,
    count: purchases.length,
    distinctBuyers: buyers.size,
    distinctFilings: filings.size,
    shares,
    value,
    averagePrice: shares > 0 ? value / shares : null,
    latestDate,
    ageDays,
    actionableFreshness: ageDays !== null && ageDays <= ACTIONABLE_MAX_AGE_DAYS,
    source: "SEC EDGAR Form 4",
    verificationRule: "Transaction code P · acquired A · positive shares and price · SEC filing linked",
  };
}

module.exports = {
  ACTIONABLE_MAX_AGE_DAYS,
  isVerifiedOpenMarketPurchase,
  summarizeVerifiedPurchases,
};
