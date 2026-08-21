const { aggregateToWeeklyBars, isoWeekKey } = require("./weeklyBarAggregator");
const { calculateRetracementLevels } = require("./retracementCalculator");
const { IMPACTONE_FIBONACCI_PROFILE } = require("./impactOneFibonacciProfile");

const WEEKLY_LOOKBACK = 52;
const MIN_WEEKLY_BARS = 20;
const MAX_WEEKS_SINCE_HIGH = 26;
const MIN_SWING_STRENGTH_PCT = 10;

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function isCurrentWeeklyCandleClosed(now = new Date()) {
  const day = now.getUTCDay();
  if (day === 0 || day === 6) return true;
  return day === 5 && now.getUTCHours() >= 21;
}

function completedWeeklyBars(weeklyBars, now = new Date()) {
  const bars = Array.isArray(weeklyBars) ? weeklyBars.filter(Boolean) : [];
  if (!bars.length || isCurrentWeeklyCandleClosed(now)) return bars;
  const latest = bars.at(-1);
  const today = now.toISOString().slice(0, 10);
  return latest?.weekKey === isoWeekKey(today) ? bars.slice(0, -1) : bars;
}

function selectWeeklyLowToHighSwing(weeklyBars, lookback = WEEKLY_LOOKBACK) {
  const window = (weeklyBars || []).slice(-Math.max(3, lookback));
  if (window.length < 3) return null;
  let best = null;
  for (let lowIndex = 0; lowIndex < window.length - 2; lowIndex += 1) {
    const swingLow = Number(window[lowIndex]?.low);
    if (!(swingLow > 0)) continue;
    for (let highIndex = lowIndex + 1; highIndex < window.length - 1; highIndex += 1) {
      const swingHigh = Number(window[highIndex]?.high);
      if (!(swingHigh > swingLow)) continue;
      const strengthPct = ((swingHigh - swingLow) / swingLow) * 100;
      if (!best || strengthPct > best.strengthPct) {
        best = {
          direction: "UP",
          swingLow,
          swingHigh,
          swingLowDate: window[lowIndex].date,
          swingHighDate: window[highIndex].date,
          swingLowIndex: lowIndex,
          swingHighIndex: highIndex,
          weeksSinceHigh: window.length - 1 - highIndex,
          strengthPct,
        };
      }
    }
  }
  return best;
}

function unavailable(symbol, reason, weeklyBars = 0) {
  return {
    symbol,
    dataAvailable: false,
    signalEligible: false,
    reason,
    candleTimeframe: "1W",
    weeklyBars,
    strategyVersion: IMPACTONE_FIBONACCI_PROFILE.strategyVersion,
  };
}

function analyzeWeeklyBars(symbol, rawWeeklyBars, { now = new Date() } = {}) {
  const weeklyBars = completedWeeklyBars(rawWeeklyBars, now);
  if (weeklyBars.length < MIN_WEEKLY_BARS) {
    return unavailable(symbol, `At least ${MIN_WEEKLY_BARS} completed weekly candles are required.`, weeklyBars.length);
  }

  const swing = selectWeeklyLowToHighSwing(weeklyBars);
  if (!swing) return unavailable(symbol, "No chronological weekly low followed by a later weekly high was found.", weeklyBars.length);

  const targetRatio = IMPACTONE_FIBONACCI_PROFILE.entryZone.targetRatio;
  const target = calculateRetracementLevels(swing, { activeRatios: [targetRatio] })?.[0];
  const currentPrice = Number(weeklyBars.at(-1)?.close);
  if (!target || !(currentPrice > 0)) return unavailable(symbol, "The weekly 0.886 point could not be calculated.", weeklyBars.length);

  const targetPrice = Number(target.price);
  const previousClose = Number(weeklyBars.at(-2)?.close);
  const distancePct = ((currentPrice - targetPrice) / targetPrice) * 100;
  const previousDistancePct = ((previousClose - targetPrice) / targetPrice) * 100;
  const postHighBars = weeklyBars.slice(-(swing.weeksSinceHigh + 1));
  const crossedTargetBeforeLatest = postHighBars.slice(0, -1).some((bar) => Number(bar.close) < targetPrice);
  const movingTowardTarget = previousClose > currentPrice && previousDistancePct > distancePct;
  const freshSwing = swing.weeksSinceHigh >= 1 && swing.weeksSinceHigh <= MAX_WEEKS_SINCE_HIGH;
  const meaningfulSwing = swing.strengthPct >= MIN_SWING_STRENGTH_PCT;
  const inApproachZone = distancePct >= IMPACTONE_FIBONACCI_PROFILE.entryZone.minDistancePct
    && distancePct <= IMPACTONE_FIBONACCI_PROFILE.entryZone.maxDistancePct;
  // A price being numerically close to 0.886 is not enough. ImpactOne's
  // weekly setup is a first approach from above after a meaningful, recent
  // low -> later high swing. Recoveries from below and prices moving away
  // from the target must never be promoted as entry candidates.
  const signalEligible = inApproachZone
    && movingTowardTarget
    && !crossedTargetBeforeLatest
    && freshSwing
    && meaningfulSwing;
  const warnings = [
    ...(!movingTowardTarget ? ["The latest completed weekly close is not moving down toward 0.886."] : []),
    ...(crossedTargetBeforeLatest ? ["A prior completed weekly close crossed below 0.886."] : []),
    ...(!freshSwing ? [`The selected high is older than ${MAX_WEEKS_SINCE_HIGH} completed weeks.`] : []),
    ...(!meaningfulSwing ? [`The selected weekly swing is smaller than ${MIN_SWING_STRENGTH_PCT}%.`] : []),
  ];

  const proximityScore = clamp(100 - Math.abs(distancePct) * 6);
  const swingQuality = clamp(swing.strengthPct * 2.5);
  const pullbackMaturity = clamp(swing.weeksSinceHigh * 12);
  const technicalScore = Math.round(proximityScore * 0.6 + swingQuality * 0.25 + pullbackMaturity * 0.15);
  const status = inApproachZone
    ? distancePct <= 1.5 ? "AT_WEEKLY_0886" : "WITHIN_WEEKLY_ENTRY_ZONE"
    : distancePct < 0 ? "BELOW_WEEKLY_0886" : "ABOVE_WEEKLY_ENTRY_ZONE";

  return {
    symbol,
    dataAvailable: true,
    signalEligible,
    candleTimeframe: "1W",
    candleState: "COMPLETED_ONLY",
    weeklyBars: weeklyBars.length,
    lookbackWeeks: Math.min(WEEKLY_LOOKBACK, weeklyBars.length),
    latestWeek: weeklyBars.at(-1)?.date || null,
    currentPrice,
    targetRatio,
    targetPrice,
    distancePct,
    previousDistancePct,
    movingTowardTarget,
    crossedTargetBeforeLatest,
    freshSwing,
    meaningfulSwing,
    inApproachZone,
    strategyWarnings: warnings,
    technicalScore,
    status,
    swing,
    strategyVersion: IMPACTONE_FIBONACCI_PROFILE.strategyVersion,
  };
}

function analyzeWeeklySetup(symbol, dailyBars, options = {}) {
  return analyzeWeeklyBars(symbol, aggregateToWeeklyBars(dailyBars || []), options);
}

module.exports = {
  WEEKLY_LOOKBACK,
  MIN_WEEKLY_BARS,
  MAX_WEEKS_SINCE_HIGH,
  MIN_SWING_STRENGTH_PCT,
  isCurrentWeeklyCandleClosed,
  completedWeeklyBars,
  selectWeeklyLowToHighSwing,
  analyzeWeeklyBars,
  analyzeWeeklySetup,
};
