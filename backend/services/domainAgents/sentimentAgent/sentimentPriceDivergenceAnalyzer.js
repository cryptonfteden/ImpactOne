// Phase SENTIMENT-AGENT-001 — "Sentiment-price divergence": compares
// the real sentiment trend direction against the real price direction
// over the same lookback window (real daily bars from the existing,
// already-real priceHistoryProvider.js — no new price data source).
// A genuine divergence is flagged only when the two real signals
// actually disagree; otherwise this honestly reports "NONE".
const PRICE_FLAT_THRESHOLD_PERCENT = 1; // a real price move smaller than this counts as FLAT, not a real direction

/**
 * @param {Array<object>} priceBars - oldest-first real daily bars (already sliced to the sentiment lookback window)
 * @returns {{ priceDirection: "UP"|"DOWN"|"FLAT"|null, priceChangePercent: number|null }}
 */
function computePriceDirection(priceBars) {
  if (!priceBars || priceBars.length < 2) return { priceDirection: null, priceChangePercent: null };
  const first = priceBars[0].close;
  const last = priceBars[priceBars.length - 1].close;
  if (!Number.isFinite(first) || !Number.isFinite(last) || first === 0) return { priceDirection: null, priceChangePercent: null };

  const priceChangePercent = Math.round(((last - first) / first) * 100 * 100) / 100;
  let priceDirection = "FLAT";
  if (priceChangePercent > PRICE_FLAT_THRESHOLD_PERCENT) priceDirection = "UP";
  else if (priceChangePercent < -PRICE_FLAT_THRESHOLD_PERCENT) priceDirection = "DOWN";

  return { priceDirection, priceChangePercent };
}

/**
 * @param {"IMPROVING"|"STABLE"|"DETERIORATING"} sentimentTrend
 * @param {Array<object>} priceBars
 * @returns {{ divergence: "BULLISH_DIVERGENCE"|"BEARISH_DIVERGENCE"|"NONE", priceDirection: string|null, priceChangePercent: number|null }}
 */
function analyzeSentimentPriceDivergence(sentimentTrend, priceBars) {
  const { priceDirection, priceChangePercent } = computePriceDirection(priceBars);

  let divergence = "NONE";
  if (priceDirection === "DOWN" && sentimentTrend === "IMPROVING") divergence = "BULLISH_DIVERGENCE";
  else if (priceDirection === "UP" && sentimentTrend === "DETERIORATING") divergence = "BEARISH_DIVERGENCE";

  return { divergence, priceDirection, priceChangePercent };
}

module.exports = { analyzeSentimentPriceDivergence, computePriceDirection, PRICE_FLAT_THRESHOLD_PERCENT };
