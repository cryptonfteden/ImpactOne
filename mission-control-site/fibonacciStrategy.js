const { aggregateToMonthlyBars } = require("../backend/services/domainAgents/fibonacciAgent/monthlyBarAggregator");
const { calculateRetracementLevels } = require("../backend/services/domainAgents/fibonacciAgent/retracementCalculator");

// ImpactOne strategy: the anchor must move chronologically from a monthly
// low to a later monthly high. A high that predates the low is not an UP swing.
function selectMonthlyLowToHighSwing(monthlyBars, lookback = 12) {
  const window = (monthlyBars || []).slice(-Math.max(2, lookback));
  if (window.length < 2) return null;
  let best = null;
  for (let lowIndex = 0; lowIndex < window.length - 1; lowIndex += 1) {
    const swingLow = Number(window[lowIndex].low);
    if (!(swingLow > 0)) continue;
    for (let highIndex = lowIndex + 1; highIndex < window.length; highIndex += 1) {
      const swingHigh = Number(window[highIndex].high);
      if (!(swingHigh > swingLow)) continue;
      const strength = (swingHigh - swingLow) / swingLow;
      if (!best || strength > best.strength) best = { direction: "UP", swingLow, swingHigh, swingLowDate: window[lowIndex].date, swingHighDate: window[highIndex].date, swingLowIndex: lowIndex, swingHighIndex: highIndex, strength };
    }
  }
  return best;
}

function buildMonthlyFibonacci(dailyBars, lookback = 12) {
  const monthlyBars = aggregateToMonthlyBars(dailyBars);
  const swing = selectMonthlyLowToHighSwing(monthlyBars, lookback);
  const levels = calculateRetracementLevels(swing);
  if (!swing || !levels) return null;
  return { strategy: "MONTHLY_LOW_TO_HIGH", candleTimeframe: "1M", lookbackMonths: Math.min(lookback, monthlyBars.length), ...swing, levels };
}

// Build the same approved 0 / 0.886 / 1 study from the verified candles that
// are actually shown in the active chart. The anchors always move forward in
// time: a low first, followed by a later high.
function buildTimeframeFibonacci(bars, options = {}) {
  const allBars = (Array.isArray(bars) ? bars : [])
    .filter((bar) => bar?.date && Number(bar.low) > 0 && Number(bar.high) > 0)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const requestedLookback = Number(options.lookbackBars);
  const lookbackBars = Number.isInteger(requestedLookback) && requestedLookback >= 2
    ? Math.min(requestedLookback, allBars.length)
    : allBars.length;
  // The strategy must describe the active horizon, not an unrelated IPO-era
  // move that happens to exist in the provider's deeper history. Weekly scans
  // and the weekly chart both use the same trailing 52 verified candles.
  const window = allBars.slice(-lookbackBars);
  const swing = selectMonthlyLowToHighSwing(window, window.length);
  const levels = calculateRetracementLevels(swing);
  if (!swing || !levels) return null;
  return {
    strategy: "ACTIVE_TIMEFRAME_LOW_TO_HIGH",
    candleTimeframe: options.candleTimeframe || options.range || null,
    sourceRange: options.range || null,
    source: options.source || null,
    barCount: allBars.length,
    analysisBarCount: window.length,
    ...swing,
    levels,
  };
}

module.exports = { selectMonthlyLowToHighSwing, buildMonthlyFibonacci, buildTimeframeFibonacci };
