// Phase ETF-FLOW-AGENT-001 — "Daily/Weekly/Monthly ETF flows", computed
// as a disclosed, real TRADING-ACTIVITY PROXY (real dollar volume =
// real close × real volume, summed over a real window; real direction
// = real price change over that same window) — never presented as true
// creation/redemption unit flow data, which no licensed feed in this
// environment can supply. This is the same "proxy, not the real
// underlying metric" discipline `marketSentimentScorers.scoreNewsSentiment`
// already discloses for its own feed-based sentiment proxy.
const DAILY_WINDOW = 1;
const WEEKLY_WINDOW = 5;
const MONTHLY_WINDOW = 21;
const FLAT_THRESHOLD_PERCENT = 0.1;

/**
 * @param {Array<object>} bars - oldest-first real daily bars
 * @param {number} windowSize
 * @returns {{ dollarVolume: number, priceChangePercent: number, direction: "INFLOW"|"OUTFLOW"|"FLAT", signedProxyValue: number } | null}
 */
function computeFlowProxy(bars, windowSize) {
  // A one-session return needs two closes: the prior close and today's
  // close. The same boundary rule applies to 5- and 21-session windows.
  // Dollar volume is summed only for the sessions inside the requested
  // window; the extra bar is used solely as the return baseline.
  if (bars.length < windowSize + 1) return null;
  const baseline = bars[bars.length - windowSize - 1];
  const window = bars.slice(-windowSize);

  const dollarVolume = window.reduce((sum, bar) => sum + (Number.isFinite(bar.close) && Number.isFinite(bar.volume) ? bar.close * bar.volume : 0), 0);
  const first = baseline.close;
  const last = window[window.length - 1].close;
  const priceChangePercent = Number.isFinite(first) && Number.isFinite(last) && first !== 0 ? ((last - first) / first) * 100 : 0;

  let direction = "FLAT";
  if (priceChangePercent > FLAT_THRESHOLD_PERCENT) direction = "INFLOW";
  else if (priceChangePercent < -FLAT_THRESHOLD_PERCENT) direction = "OUTFLOW";

  const signedProxyValue = direction === "INFLOW" ? dollarVolume : direction === "OUTFLOW" ? -dollarVolume : 0;

  return {
    dollarVolume: Math.round(dollarVolume * 100) / 100,
    priceChangePercent: Math.round(priceChangePercent * 100) / 100,
    direction,
    signedProxyValue: Math.round(signedProxyValue * 100) / 100,
  };
}

/**
 * @param {Array<object>} bars - oldest-first real daily bars
 * @returns {{ daily: object|null, weekly: object|null, monthly: object|null }}
 */
function computeDailyWeeklyMonthlyFlows(bars) {
  return {
    daily: computeFlowProxy(bars, DAILY_WINDOW),
    weekly: computeFlowProxy(bars, WEEKLY_WINDOW),
    monthly: computeFlowProxy(bars, MONTHLY_WINDOW),
  };
}

module.exports = { computeFlowProxy, computeDailyWeeklyMonthlyFlows, DAILY_WINDOW, WEEKLY_WINDOW, MONTHLY_WINDOW, FLAT_THRESHOLD_PERCENT };
