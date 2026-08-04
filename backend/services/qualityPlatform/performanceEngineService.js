// Sprint 42 — Performance Engine.
//
// Computes real, derived-from-real-price-history metrics for a
// recommendation's window: absolute return, return vs SPY, return vs a
// sector ETF (when a real sector is known), max drawdown, max gain, time
// to target, time to failure, and volatility during the window. Reuses
// priceHistoryProvider.getDailyBars (Sprint 37, no new provider) for every
// price series, including SPY and sector ETFs — the same function used for
// any stock symbol. Never fabricates a metric it can't compute: an
// unavailable price series means the whole result is honestly null, not a
// zero or a guess.
const priceHistoryProvider = require("../intelligence/priceHistoryProvider");
const { getSectorEtf } = require("./sectorEtfMap");

const BENCHMARK_SYMBOL = "SPY";

function rangeForDays(days) {
  if (days <= 5) return "5d";
  if (days <= 30) return "1mo";
  if (days <= 90) return "3mo";
  if (days <= 180) return "6mo";
  if (days <= 365) return "1y";
  return "2y";
}

function firstTargetCrossing(bars, entryPrice, targetPct, direction) {
  if (!Number.isFinite(targetPct)) return null;
  const targetPrice = direction === "up" ? entryPrice * (1 + targetPct / 100) : entryPrice * (1 - Math.abs(targetPct) / 100);
  const startDate = new Date(bars[0]?.date);
  for (const bar of bars) {
    const crossed = direction === "up" ? bar.close >= targetPrice : bar.close <= targetPrice;
    if (crossed) {
      return Math.round((new Date(bar.date) - startDate) / (24 * 60 * 60 * 1000));
    }
  }
  return null;
}

/** First number found in a string like "10-15%" or "-8% tactical stop" — the target percentage, signed. */
function extractTargetPct(text) {
  const match = String(text || "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function computeReturnSeries(bars) {
  const returns = [];
  for (let i = 1; i < bars.length; i += 1) {
    if (bars[i - 1].close > 0) returns.push((bars[i].close - bars[i - 1].close) / bars[i - 1].close);
  }
  return returns;
}

function computeVolatilityPct(bars) {
  const returns = computeReturnSeries(bars);
  if (returns.length < 2) return null;
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (returns.length - 1);
  return Number((Math.sqrt(variance) * 100).toFixed(4));
}

function computeDrawdownAndGain(bars, entryPrice) {
  let peak = entryPrice;
  let maxDrawdownPct = 0;
  let maxGainPct = 0;
  for (const bar of bars) {
    peak = Math.max(peak, bar.close);
    const drawdownPct = ((bar.close - peak) / peak) * 100;
    const gainPct = ((bar.close - entryPrice) / entryPrice) * 100;
    if (drawdownPct < maxDrawdownPct) maxDrawdownPct = drawdownPct;
    if (gainPct > maxGainPct) maxGainPct = gainPct;
  }
  return { maxDrawdownPct: Number(maxDrawdownPct.toFixed(4)), maxGainPct: Number(maxGainPct.toFixed(4)) };
}

function totalReturnPct(bars, entryPrice) {
  if (!bars.length || !Number.isFinite(entryPrice) || entryPrice === 0) return null;
  const lastClose = bars[bars.length - 1].close;
  return Number((((lastClose - entryPrice) / entryPrice) * 100).toFixed(4));
}

/**
 * @param {object} params
 * @param {string} params.symbol
 * @param {number} params.entryPrice
 * @param {Date|string} params.startDate — the recommendation's createdAt
 * @param {string} [params.sector] — real sector when known (e.g. from portfolioContext); null is honest, never guessed
 * @param {string} [params.expectedUpside] — e.g. "10-15%"
 * @param {string} [params.expectedDownside] — e.g. "-8% tactical stop"
 */
async function computePerformanceMetrics({ symbol, entryPrice, startDate, sector = null, expectedUpside = null, expectedDownside = null }) {
  if (!Number.isFinite(entryPrice) || entryPrice <= 0) return null;

  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return null;

  const daysElapsed = Math.max(1, Math.round((Date.now() - start.getTime()) / (24 * 60 * 60 * 1000)));
  const range = rangeForDays(daysElapsed);
  const startDateKey = start.toISOString().slice(0, 10);

  const symbolBars = (await priceHistoryProvider.getDailyBars(symbol, { range })).filter((bar) => bar.date >= startDateKey);
  if (!symbolBars.length) return null;

  const sectorEtfSymbol = getSectorEtf(sector);
  const [spyBarsRaw, sectorBarsRaw] = await Promise.all([
    priceHistoryProvider.getDailyBars(BENCHMARK_SYMBOL, { range }),
    sectorEtfSymbol ? priceHistoryProvider.getDailyBars(sectorEtfSymbol, { range }) : Promise.resolve([]),
  ]);
  const spyBars = spyBarsRaw.filter((bar) => bar.date >= startDateKey);
  const sectorBars = sectorBarsRaw.filter((bar) => bar.date >= startDateKey);

  const absoluteReturnPct = totalReturnPct(symbolBars, entryPrice);
  const spyReturnPct = spyBars.length ? totalReturnPct(spyBars, spyBars[0].close) : null;
  const sectorReturnPct = sectorBars.length ? totalReturnPct(sectorBars, sectorBars[0].close) : null;

  const { maxDrawdownPct, maxGainPct } = computeDrawdownAndGain(symbolBars, entryPrice);
  const volatilityPct = computeVolatilityPct(symbolBars);
  const timeToTargetDays = firstTargetCrossing(symbolBars, entryPrice, extractTargetPct(expectedUpside), "up");
  const timeToFailureDays = firstTargetCrossing(symbolBars, entryPrice, extractTargetPct(expectedDownside), "down");

  return {
    absoluteReturnPct,
    returnVsSpyPct: Number.isFinite(absoluteReturnPct) && Number.isFinite(spyReturnPct) ? Number((absoluteReturnPct - spyReturnPct).toFixed(4)) : null,
    spyReturnPct,
    sectorEtfSymbol,
    returnVsSectorPct: Number.isFinite(absoluteReturnPct) && Number.isFinite(sectorReturnPct) ? Number((absoluteReturnPct - sectorReturnPct).toFixed(4)) : null,
    sectorEtfReturnPct: sectorReturnPct,
    maxDrawdownPct,
    maxGainPct,
    volatilityPct,
    timeToTargetDays,
    timeToFailureDays,
  };
}

module.exports = { computePerformanceMetrics, extractTargetPct, rangeForDays };
