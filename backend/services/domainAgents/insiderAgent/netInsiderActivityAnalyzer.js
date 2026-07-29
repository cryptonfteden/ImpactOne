// Phase INSIDER-AGENT-001 — "Insider Activity" (Bullish/Neutral/
// Bearish) and "Net Insider Score". Only real OPEN-MARKET transactions
// — Form 4 transaction code "P" (purchase) and "S" (sale) — feed this
// signal; grants (A), option exercises (M), tax withholding (F), and
// gifts (G) are real transactions but not discretionary market
// decisions, so including them would misrepresent routine compensation
// events as a bullish/bearish conviction signal. This is the same
// well-established convention real insider-analysis platforms use.
const BULLISH_SCORE_THRESHOLD = 20;
const BEARISH_SCORE_THRESHOLD = -20;

function dollarValue(transaction) {
  return Number.isFinite(transaction.shares) && Number.isFinite(transaction.pricePerShare) ? transaction.shares * transaction.pricePerShare : null;
}

/**
 * @param {Array<object>} transactions - real Form 4 non-derivative transactions
 * @returns {{ insiderActivity: "BULLISH"|"NEUTRAL"|"BEARISH", netInsiderScore: number, buyValue: number, sellValue: number, buyCount: number, sellCount: number }}
 */
function analyzeNetInsiderActivity(transactions) {
  const buys = transactions.filter((t) => t.transactionCode === "P");
  const sells = transactions.filter((t) => t.transactionCode === "S");

  const buyValue = buys.reduce((sum, t) => sum + (dollarValue(t) || 0), 0);
  const sellValue = sells.reduce((sum, t) => sum + (dollarValue(t) || 0), 0);
  const totalValue = buyValue + sellValue;

  const netInsiderScore = totalValue > 0 ? Math.round(((buyValue - sellValue) / totalValue) * 100) : 0;

  let insiderActivity = "NEUTRAL";
  if (netInsiderScore >= BULLISH_SCORE_THRESHOLD) insiderActivity = "BULLISH";
  else if (netInsiderScore <= BEARISH_SCORE_THRESHOLD) insiderActivity = "BEARISH";

  return {
    insiderActivity,
    netInsiderScore,
    buyValue: Math.round(buyValue * 100) / 100,
    sellValue: Math.round(sellValue * 100) / 100,
    buyCount: buys.length,
    sellCount: sells.length,
  };
}

module.exports = { analyzeNetInsiderActivity, dollarValue, BULLISH_SCORE_THRESHOLD, BEARISH_SCORE_THRESHOLD };
