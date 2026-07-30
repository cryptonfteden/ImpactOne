// Phase MACRO-AGENT-001 — "Confidence (0-100)". A disclosed, weighted
// blend of real data availability across all 11 real sources (7 FRED
// series + 4 market proxies) — never a naive average of unrelated
// scores. FRED series are weighted more heavily (70 of 100 points
// total) than the market proxies (30 points) since the FRED series
// drive most of the agent's classifications (inflation, employment,
// yield curve, credit spread, policy, liquidity), while the market
// proxies (VIX/oil/gold/USD) only feed market-stress and supplementary
// context.
const FRED_WEIGHT_TOTAL = 70;
const PROXY_WEIGHT_TOTAL = 30;

/**
 * @param {Object<string, {dataAvailable: boolean}>} fredSeriesMap - the 7 real FRED series results, keyed by name
 * @param {Object<string, {dataAvailable: boolean}>} marketProxyMap - the 4 real market-proxy results, keyed by name
 * @returns {{ confidence: number, availableSourceCount: number, totalSourceCount: number }}
 */
function computeConfidence(fredSeriesMap, marketProxyMap) {
  const fredEntries = Object.values(fredSeriesMap);
  const proxyEntries = Object.values(marketProxyMap);

  const fredAvailableCount = fredEntries.filter((entry) => entry.dataAvailable).length;
  const proxyAvailableCount = proxyEntries.filter((entry) => entry.dataAvailable).length;

  const fredScore = fredEntries.length ? (fredAvailableCount / fredEntries.length) * FRED_WEIGHT_TOTAL : 0;
  const proxyScore = proxyEntries.length ? (proxyAvailableCount / proxyEntries.length) * PROXY_WEIGHT_TOTAL : 0;

  const confidence = Math.round(fredScore + proxyScore);
  const availableSourceCount = fredAvailableCount + proxyAvailableCount;
  const totalSourceCount = fredEntries.length + proxyEntries.length;

  return { confidence, availableSourceCount, totalSourceCount };
}

module.exports = { computeConfidence, FRED_WEIGHT_TOTAL, PROXY_WEIGHT_TOTAL };
