// Sprint 37 Priority 9 — Technical Intelligence.
//
// Wraps the pure math in technicalIndicators.js with the honesty contract
// the mission requires: "technical signals are evidence, not verdicts."
// Every result names its timeframe, its calculation inputs, an
// invalidation level (the price level that would prove the signal wrong),
// freshness, and an explicit enough-data status — never a bare number
// presented as a conclusion.
const priceHistoryProvider = require("./priceHistoryProvider");
const indicators = require("./technicalIndicators");

const MIN_BARS_FOR_ANALYSIS = 60;

function buildSignal({ name, timeframe, calculationInputs, signal, strength, invalidationLevel, enoughData, freshness }) {
  return {
    name,
    timeframe,
    calculationInputs,
    signal,
    strength: enoughData ? strength : null,
    invalidationLevel: enoughData ? invalidationLevel : null,
    freshness,
    enoughDataStatus: enoughData ? "SUFFICIENT" : "INSUFFICIENT",
  };
}

function analyzeTrend(closes, timeframe, freshness) {
  const sma50 = indicators.simpleMovingAverage(closes, 50);
  const sma200 = indicators.simpleMovingAverage(closes, 200);
  const enoughData = Number.isFinite(sma50) && closes.length >= 50;

  let signal = "NEUTRAL";
  if (enoughData) {
    const lastClose = closes[closes.length - 1];
    if (Number.isFinite(sma200)) {
      signal = lastClose > sma50 && sma50 > sma200 ? "UPTREND" : lastClose < sma50 && sma50 < sma200 ? "DOWNTREND" : "MIXED";
    } else {
      signal = lastClose > sma50 ? "ABOVE_50D_AVERAGE" : "BELOW_50D_AVERAGE";
    }
  }

  return buildSignal({
    name: "trend",
    timeframe,
    calculationInputs: { sma50, sma200, lastClose: closes[closes.length - 1] ?? null },
    signal,
    strength: signal === "UPTREND" || signal === "DOWNTREND" ? 70 : 40,
    invalidationLevel: Number.isFinite(sma50) ? sma50 : null,
    enoughData,
    freshness,
  });
}

function analyzeMovingAverages(closes, timeframe, freshness) {
  const sma20 = indicators.simpleMovingAverage(closes, 20);
  const sma50 = indicators.simpleMovingAverage(closes, 50);
  const ema20 = indicators.exponentialMovingAverage(closes, 20);
  const enoughData = Number.isFinite(sma20);

  return buildSignal({
    name: "movingAverages",
    timeframe,
    calculationInputs: { sma20, sma50, ema20 },
    signal: enoughData ? (closes[closes.length - 1] > sma20 ? "ABOVE_SHORT_AVERAGE" : "BELOW_SHORT_AVERAGE") : "UNKNOWN",
    strength: 50,
    invalidationLevel: sma20,
    enoughData,
    freshness,
  });
}

function analyzeRSI(closes, timeframe, freshness) {
  const rsi = indicators.relativeStrengthIndex(closes, 14);
  const enoughData = Number.isFinite(rsi);
  let signal = "NEUTRAL";
  if (enoughData) {
    signal = rsi >= 70 ? "OVERBOUGHT" : rsi <= 30 ? "OVERSOLD" : "NEUTRAL";
  }

  return buildSignal({
    name: "rsi",
    timeframe,
    calculationInputs: { period: 14, value: rsi },
    signal,
    strength: signal === "NEUTRAL" ? 30 : 65,
    invalidationLevel: null,
    enoughData,
    freshness,
  });
}

function analyzeMACD(closes, timeframe, freshness) {
  const result = indicators.macd(closes, 12, 26, 9);
  const enoughData = Boolean(result);

  return buildSignal({
    name: "macd",
    timeframe,
    calculationInputs: result || { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
    signal: enoughData ? (result.histogram > 0 ? "BULLISH_CROSSOVER" : "BEARISH_CROSSOVER") : "UNKNOWN",
    strength: enoughData ? Math.min(100, Math.round(Math.abs(result.histogram) * 10)) : null,
    invalidationLevel: null,
    enoughData,
    freshness,
  });
}

function analyzeATR(bars, timeframe, freshness) {
  const atr = indicators.averageTrueRange(bars, 14);
  const enoughData = Number.isFinite(atr);
  const lastClose = bars[bars.length - 1]?.close;

  return buildSignal({
    name: "atr",
    timeframe,
    calculationInputs: { period: 14, value: atr, lastClose },
    signal: enoughData ? "MEASURED" : "UNKNOWN",
    strength: null,
    invalidationLevel: null,
    enoughData,
    freshness,
  });
}

function analyzeVWAP(bars, timeframe, freshness) {
  const vwap = indicators.volumeWeightedAveragePrice(bars);
  const enoughData = Number.isFinite(vwap);
  const lastClose = bars[bars.length - 1]?.close;

  return buildSignal({
    name: "vwap",
    timeframe,
    calculationInputs: { value: vwap, lastClose },
    signal: enoughData ? (lastClose > vwap ? "ABOVE_VWAP" : "BELOW_VWAP") : "UNKNOWN",
    strength: 40,
    invalidationLevel: vwap,
    enoughData,
    freshness,
  });
}

function analyzeBollinger(closes, timeframe, freshness) {
  const bands = indicators.bollingerBands(closes, 20, 2);
  const enoughData = Boolean(bands);
  const lastClose = closes[closes.length - 1];

  let signal = "INSIDE_BANDS";
  if (enoughData) {
    if (lastClose >= bands.upper) signal = "AT_OR_ABOVE_UPPER_BAND";
    else if (lastClose <= bands.lower) signal = "AT_OR_BELOW_LOWER_BAND";
  }

  return buildSignal({
    name: "bollingerBands",
    timeframe,
    calculationInputs: bands || { period: 20, stdDevMultiplier: 2 },
    signal: enoughData ? signal : "UNKNOWN",
    strength: signal === "INSIDE_BANDS" ? 30 : 60,
    invalidationLevel: enoughData ? bands.middle : null,
    enoughData,
    freshness,
  });
}

function analyzeFibonacci(bars, timeframe, freshness) {
  const window = bars.slice(-60);
  const high = window.length ? Math.max(...window.map((bar) => bar.high)) : null;
  const low = window.length ? Math.min(...window.map((bar) => bar.low)) : null;
  const levels = Number.isFinite(high) && Number.isFinite(low) ? indicators.fibonacciRetracement(high, low) : null;

  return {
    ...buildSignal({
      name: "fibonacciRetracement",
      timeframe,
      calculationInputs: { high, low, lookback: window.length },
      signal: levels ? "LEVELS_COMPUTED" : "UNKNOWN",
      strength: 30,
      invalidationLevel: null,
      enoughData: Boolean(levels),
      freshness,
    }),
    ...(levels ? { levels } : {}),
  };
}

function analyzeSupportResistance(bars, timeframe, freshness) {
  const result = indicators.detectSupportResistance(bars, 60);
  const enoughData = Boolean(result);
  const lastClose = bars[bars.length - 1]?.close;

  let signal = "WITHIN_RANGE";
  if (enoughData && Number.isFinite(lastClose)) {
    if (lastClose >= result.resistance) signal = "AT_RESISTANCE";
    else if (lastClose <= result.support) signal = "AT_SUPPORT";
  }

  return {
    ...buildSignal({
      name: "supportResistance",
      timeframe,
      calculationInputs: { lookback: 60 },
      signal: enoughData ? signal : "UNKNOWN",
      strength: signal === "WITHIN_RANGE" ? 30 : 55,
      invalidationLevel: enoughData ? (signal === "AT_RESISTANCE" ? result.resistance : result.support) : null,
      enoughData,
      freshness,
    }),
    ...(enoughData ? { support: result.support, resistance: result.resistance } : {}),
  };
}

// Breakout: close beyond the prior lookback-window high/low on above-
// average volume. Failed breakout: a breakout in the last 3 bars that has
// since closed back inside the prior range — an honest, narrow definition
// rather than a vague "reversal" claim.
function analyzeBreakout(bars, timeframe, freshness) {
  if (bars.length < 25) {
    return buildSignal({ name: "breakout", timeframe, calculationInputs: {}, signal: "UNKNOWN", strength: null, invalidationLevel: null, enoughData: false, freshness });
  }

  const lookbackWindow = bars.slice(-21, -1);
  const priorHigh = Math.max(...lookbackWindow.map((bar) => bar.high));
  const priorLow = Math.min(...lookbackWindow.map((bar) => bar.low));
  const avgVolume = lookbackWindow.reduce((sum, bar) => sum + (bar.volume || 0), 0) / lookbackWindow.length;
  const last = bars[bars.length - 1];
  const volumeConfirmed = Number.isFinite(last.volume) && last.volume > avgVolume * 1.2;

  let signal = "NO_BREAKOUT";
  if (last.close > priorHigh) signal = volumeConfirmed ? "BREAKOUT_UP_CONFIRMED" : "BREAKOUT_UP_UNCONFIRMED";
  else if (last.close < priorLow) signal = volumeConfirmed ? "BREAKOUT_DOWN_CONFIRMED" : "BREAKOUT_DOWN_UNCONFIRMED";

  // Failed breakout: 2-5 bars ago the close broke the range that was
  // current AT THAT TIME, but the current close has fallen back inside
  // today's lookback range.
  let failedBreakout = false;
  for (let lag = 2; lag <= 5 && bars.length - lag - 21 >= 0; lag++) {
    const pastBar = bars[bars.length - lag];
    const pastWindow = bars.slice(bars.length - lag - 21, bars.length - lag);
    const pastHigh = Math.max(...pastWindow.map((bar) => bar.high));
    const pastLow = Math.min(...pastWindow.map((bar) => bar.low));
    if ((pastBar.close > pastHigh || pastBar.close < pastLow) && last.close <= priorHigh && last.close >= priorLow) {
      failedBreakout = true;
      break;
    }
  }
  if (failedBreakout) signal = "FAILED_BREAKOUT";

  return buildSignal({
    name: "breakout",
    timeframe,
    calculationInputs: { priorHigh, priorLow, avgVolume, lastVolume: last.volume ?? null, lastClose: last.close },
    signal,
    strength: signal.includes("CONFIRMED") ? 75 : signal === "FAILED_BREAKOUT" ? 60 : 35,
    invalidationLevel: signal.includes("UP") ? priorHigh : signal.includes("DOWN") ? priorLow : null,
    enoughData: true,
    freshness,
  });
}

// Volatility regime: today's ATR as a percentile of the last 60 days'
// rolling ATR — a genuinely relative measure, not an arbitrary cutoff.
function analyzeVolatilityRegime(bars, timeframe, freshness) {
  if (bars.length < 80) {
    return buildSignal({ name: "volatilityRegime", timeframe, calculationInputs: {}, signal: "UNKNOWN", strength: null, invalidationLevel: null, enoughData: false, freshness });
  }

  const atrSeries = [];
  for (let i = 15; i < bars.length; i++) {
    const atr = indicators.averageTrueRange(bars.slice(i - 15, i + 1), 14);
    if (Number.isFinite(atr)) atrSeries.push(atr);
  }
  const currentATR = atrSeries[atrSeries.length - 1];
  const sorted = atrSeries.slice().sort((a, b) => a - b);
  const percentile = Math.round((sorted.indexOf(currentATR) / (sorted.length - 1)) * 100);

  const signal = percentile >= 75 ? "HIGH_VOLATILITY" : percentile <= 25 ? "LOW_VOLATILITY" : "NORMAL_VOLATILITY";

  return buildSignal({
    name: "volatilityRegime",
    timeframe,
    calculationInputs: { currentATR, percentile, lookbackDays: atrSeries.length },
    signal,
    strength: signal === "NORMAL_VOLATILITY" ? 30 : 55,
    invalidationLevel: null,
    enoughData: true,
    freshness,
  });
}

/**
 * The single entry point: given real daily bars (oldest first), returns
 * every supported signal, each independently marked enough-data or not.
 * No signal here is a verdict — canonicalVerdict/committee logic elsewhere
 * decides what to do with this evidence, exactly as with every other
 * intelligence category.
 */
function analyzeBars(bars, { timeframe = "1D" } = {}) {
  const closes = indicators.closesOf(bars);
  const lastBarDate = bars[bars.length - 1]?.date || null;
  const freshness = lastBarDate ? { lastBarDate, ageDays: Math.floor((Date.now() - new Date(lastBarDate).getTime()) / 86400000) } : null;

  const fib = analyzeFibonacci(bars, timeframe, freshness);

  return {
    timeframe,
    barsUsed: bars.length,
    freshness,
    enoughDataStatus: bars.length >= MIN_BARS_FOR_ANALYSIS ? "SUFFICIENT" : "INSUFFICIENT",
    signals: {
      trend: analyzeTrend(closes, timeframe, freshness),
      movingAverages: analyzeMovingAverages(closes, timeframe, freshness),
      rsi: analyzeRSI(closes, timeframe, freshness),
      macd: analyzeMACD(closes, timeframe, freshness),
      atr: analyzeATR(bars, timeframe, freshness),
      vwap: analyzeVWAP(bars, timeframe, freshness),
      bollingerBands: analyzeBollinger(closes, timeframe, freshness),
      fibonacciRetracement: fib,
      supportResistance: analyzeSupportResistance(bars, timeframe, freshness),
      breakout: analyzeBreakout(bars, timeframe, freshness),
      volatilityRegime: analyzeVolatilityRegime(bars, timeframe, freshness),
    },
  };
}

async function analyzeSymbol(symbol, { timeframe = "1D", range = "1y" } = {}) {
  const bars = await priceHistoryProvider.getDailyBars(symbol, { range });
  if (!bars.length) {
    return {
      symbol,
      timeframe,
      barsUsed: 0,
      freshness: null,
      enoughDataStatus: "INSUFFICIENT",
      errorState: "No price history available for this symbol right now.",
      signals: {},
    };
  }
  return { symbol, ...analyzeBars(bars, { timeframe }) };
}

module.exports = { analyzeBars, analyzeSymbol, MIN_BARS_FOR_ANALYSIS };
