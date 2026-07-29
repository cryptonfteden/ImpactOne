// Sprint 37 Priority 9 — Technical Intelligence.
//
// Pure, deterministic math over an array of daily bars
// ({ date, open, high, low, close, volume }), oldest first. No network, no
// randomness, no external state — the same input always produces the same
// output, which is what makes this testable against a known series by
// hand-computed expected values.

function closesOf(bars) {
  return bars.map((bar) => bar.close);
}

function simpleMovingAverage(values, period) {
  if (values.length < period) return null;
  const window = values.slice(values.length - period);
  return window.reduce((sum, value) => sum + value, 0) / period;
}

function simpleMovingAverageSeries(values, period) {
  const series = [];
  for (let i = period - 1; i < values.length; i++) {
    const window = values.slice(i - period + 1, i + 1);
    series.push(window.reduce((sum, value) => sum + value, 0) / period);
  }
  return series;
}

function exponentialMovingAverageSeries(values, period) {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  const series = [values.slice(0, period).reduce((sum, value) => sum + value, 0) / period];
  for (let i = period; i < values.length; i++) {
    series.push(values[i] * k + series[series.length - 1] * (1 - k));
  }
  return series;
}

function exponentialMovingAverage(values, period) {
  const series = exponentialMovingAverageSeries(values, period);
  return series.length ? series[series.length - 1] : null;
}

// Wilder's RSI — the standard formulation (average gain/loss smoothed over
// `period`, then wilder-smoothed for subsequent values).
function relativeStrengthIndex(values, period = 14) {
  if (values.length < period + 1) return null;

  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const change = values[i] - values[i - 1];
    if (change >= 0) gains += change;
    else losses += -change;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function macd(values, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (values.length < slowPeriod + signalPeriod) return null;

  const fastSeries = exponentialMovingAverageSeries(values, fastPeriod);
  const slowSeries = exponentialMovingAverageSeries(values, slowPeriod);
  // Align: fastSeries is longer (starts earlier) than slowSeries by
  // (slowPeriod - fastPeriod) entries.
  const offset = fastSeries.length - slowSeries.length;
  const macdSeries = slowSeries.map((slowValue, index) => fastSeries[index + offset] - slowValue);

  if (macdSeries.length < signalPeriod) return null;
  const signalSeries = exponentialMovingAverageSeries(macdSeries, signalPeriod);

  const macdLine = macdSeries[macdSeries.length - 1];
  const signalLine = signalSeries[signalSeries.length - 1];
  return { macd: macdLine, signal: signalLine, histogram: macdLine - signalLine };
}

// Wilder's ATR.
function averageTrueRange(bars, period = 14) {
  if (bars.length < period + 1) return null;

  const trueRanges = [];
  for (let i = 1; i < bars.length; i++) {
    const highLow = bars[i].high - bars[i].low;
    const highPrevClose = Math.abs(bars[i].high - bars[i - 1].close);
    const lowPrevClose = Math.abs(bars[i].low - bars[i - 1].close);
    trueRanges.push(Math.max(highLow, highPrevClose, lowPrevClose));
  }

  let atr = trueRanges.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
  }
  return atr;
}

function volumeWeightedAveragePrice(bars) {
  if (!bars.length) return null;
  let cumulativeTypicalVolume = 0;
  let cumulativeVolume = 0;
  for (const bar of bars) {
    if (!Number.isFinite(bar.volume) || bar.volume <= 0) continue;
    const typicalPrice = (bar.high + bar.low + bar.close) / 3;
    cumulativeTypicalVolume += typicalPrice * bar.volume;
    cumulativeVolume += bar.volume;
  }
  return cumulativeVolume > 0 ? cumulativeTypicalVolume / cumulativeVolume : null;
}

function bollingerBands(values, period = 20, stdDevMultiplier = 2) {
  if (values.length < period) return null;
  const window = values.slice(values.length - period);
  const middle = window.reduce((sum, value) => sum + value, 0) / period;
  const variance = window.reduce((sum, value) => sum + (value - middle) ** 2, 0) / period;
  const stdDev = Math.sqrt(variance);
  return {
    upper: middle + stdDevMultiplier * stdDev,
    middle,
    lower: middle - stdDevMultiplier * stdDev,
    bandwidth: middle !== 0 ? (2 * stdDevMultiplier * stdDev) / middle : null,
  };
}

// Standard retracement levels between a real high and low — the caller
// supplies which is which (retracement direction depends on trend
// direction, which this pure function has no opinion about).
const FIBONACCI_RATIOS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

function fibonacciRetracement(high, low) {
  if (!Number.isFinite(high) || !Number.isFinite(low) || high <= low) return null;
  const range = high - low;
  return FIBONACCI_RATIOS.map((ratio) => ({ ratio, price: high - range * ratio }));
}

// Deliberately simple, transparent pivot-based support/resistance: the
// highest high and lowest low over the lookback window, plus the most
// recent local pivot points (a bar whose high/low is a local extreme
// among its immediate neighbors). Not a claim of statistical optimality —
// a real, inspectable, honest first version.
function detectSupportResistance(bars, lookback = 60) {
  if (bars.length < 5) return null;
  const window = bars.slice(-Math.min(lookback, bars.length));

  const resistance = Math.max(...window.map((bar) => bar.high));
  const support = Math.min(...window.map((bar) => bar.low));

  const pivotHighs = [];
  const pivotLows = [];
  for (let i = 2; i < window.length - 2; i++) {
    const bar = window[i];
    const neighbors = [window[i - 2], window[i - 1], window[i + 1], window[i + 2]];
    if (neighbors.every((neighbor) => bar.high >= neighbor.high)) pivotHighs.push(bar.high);
    if (neighbors.every((neighbor) => bar.low <= neighbor.low)) pivotLows.push(bar.low);
  }

  return {
    resistance,
    support,
    recentPivotHighs: pivotHighs.slice(-3),
    recentPivotLows: pivotLows.slice(-3),
  };
}

// Phase TECHNICAL-AGENT-001 — Wilder's ADX (Average Directional Index),
// the standard trend-STRENGTH measure (distinct from trend DIRECTION,
// which the moving-average/trend signals above already cover) —
// requires the +DI/-DI/DX intermediate series, each Wilder-smoothed the
// same way averageTrueRange already smooths TR above. Returns null
// (never a fabricated value) with fewer than 2*period+1 bars, the
// minimum needed for both smoothing passes.
function averageDirectionalIndex(bars, period = 14) {
  if (bars.length < period * 2 + 1) return null;

  const trueRanges = [];
  const plusDMs = [];
  const minusDMs = [];
  for (let i = 1; i < bars.length; i++) {
    const upMove = bars[i].high - bars[i - 1].high;
    const downMove = bars[i - 1].low - bars[i].low;
    plusDMs.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDMs.push(downMove > upMove && downMove > 0 ? downMove : 0);

    const highLow = bars[i].high - bars[i].low;
    const highPrevClose = Math.abs(bars[i].high - bars[i - 1].close);
    const lowPrevClose = Math.abs(bars[i].low - bars[i - 1].close);
    trueRanges.push(Math.max(highLow, highPrevClose, lowPrevClose));
  }

  let smoothedTR = trueRanges.slice(0, period).reduce((sum, value) => sum + value, 0);
  let smoothedPlusDM = plusDMs.slice(0, period).reduce((sum, value) => sum + value, 0);
  let smoothedMinusDM = minusDMs.slice(0, period).reduce((sum, value) => sum + value, 0);

  const dxSeries = [];
  for (let i = period; i < trueRanges.length; i++) {
    smoothedTR = smoothedTR - smoothedTR / period + trueRanges[i];
    smoothedPlusDM = smoothedPlusDM - smoothedPlusDM / period + plusDMs[i];
    smoothedMinusDM = smoothedMinusDM - smoothedMinusDM / period + minusDMs[i];

    const plusDI = smoothedTR > 0 ? (100 * smoothedPlusDM) / smoothedTR : 0;
    const minusDI = smoothedTR > 0 ? (100 * smoothedMinusDM) / smoothedTR : 0;
    const diSum = plusDI + minusDI;
    dxSeries.push(diSum > 0 ? (100 * Math.abs(plusDI - minusDI)) / diSum : 0);
  }

  if (dxSeries.length < period) return null;

  let adx = dxSeries.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  for (let i = period; i < dxSeries.length; i++) {
    adx = (adx * (period - 1) + dxSeries[i]) / period;
  }
  return adx;
}

// Phase TECHNICAL-AGENT-001 — a real, simple volume-trend measure:
// average volume over a recent window vs. the window immediately prior
// to it, expressed as a real percent change. Classification
// (increasing/decreasing/stable) is deliberately left to the caller —
// this function only returns real numbers, the same separation of
// concerns bollingerBands/detectSupportResistance already use.
function volumeTrend(bars, { recentPeriod = 10, priorPeriod = 20 } = {}) {
  if (bars.length < recentPeriod + priorPeriod) return null;

  const recent = bars.slice(-recentPeriod);
  const prior = bars.slice(-(recentPeriod + priorPeriod), -recentPeriod);
  const recentAvgVolume = recent.reduce((sum, bar) => sum + (bar.volume || 0), 0) / recentPeriod;
  const priorAvgVolume = prior.reduce((sum, bar) => sum + (bar.volume || 0), 0) / priorPeriod;

  if (priorAvgVolume <= 0) return null;
  return {
    recentAvgVolume,
    priorAvgVolume,
    percentChange: ((recentAvgVolume - priorAvgVolume) / priorAvgVolume) * 100,
  };
}

module.exports = {
  closesOf,
  simpleMovingAverage,
  simpleMovingAverageSeries,
  exponentialMovingAverage,
  exponentialMovingAverageSeries,
  relativeStrengthIndex,
  macd,
  averageTrueRange,
  volumeWeightedAveragePrice,
  bollingerBands,
  fibonacciRetracement,
  detectSupportResistance,
  averageDirectionalIndex,
  volumeTrend,
};
