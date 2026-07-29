// Phase TECHNICAL-AGENT-001 — combines the existing, already-real RSI
// and MACD signals into one "Momentum" read. Pure, deterministic rule
// table — no new indicator math, just a documented combination of two
// already-real signals.
const MOMENTUM_STATES = Object.freeze({
  STRONG_BULLISH: "STRONG_BULLISH",
  BULLISH: "BULLISH",
  NEUTRAL: "NEUTRAL",
  BEARISH: "BEARISH",
  STRONG_BEARISH: "STRONG_BEARISH",
  OVERBOUGHT_CAUTION: "OVERBOUGHT_CAUTION",
  OVERSOLD_OPPORTUNITY: "OVERSOLD_OPPORTUNITY",
});

/**
 * @param {object} signals - TechnicalMetrics.signals (rsi, macd)
 * @returns {{ state: string, rsi: {value:number|null, signal:string|null}, macd: {signal:string|null, histogram:number|null} }}
 */
function analyzeMomentum(signals) {
  const rsiSignal = signals.rsi;
  const macdSignal = signals.macd;

  const rsi = {
    value: rsiSignal?.enoughDataStatus === "SUFFICIENT" ? rsiSignal.calculationInputs.value : null,
    signal: rsiSignal?.enoughDataStatus === "SUFFICIENT" ? rsiSignal.signal : null,
  };
  const macd = {
    signal: macdSignal?.enoughDataStatus === "SUFFICIENT" ? macdSignal.signal : null,
    histogram: macdSignal?.enoughDataStatus === "SUFFICIENT" ? macdSignal.calculationInputs.histogram : null,
  };

  // RSI extremes take priority — an overbought/oversold reading is a
  // distinct, actionable caution/opportunity flag regardless of MACD.
  if (rsi.signal === "OVERBOUGHT") return { state: MOMENTUM_STATES.OVERBOUGHT_CAUTION, rsi, macd };
  if (rsi.signal === "OVERSOLD") return { state: MOMENTUM_STATES.OVERSOLD_OPPORTUNITY, rsi, macd };

  const macdBullish = macd.signal === "BULLISH_CROSSOVER";
  const macdBearish = macd.signal === "BEARISH_CROSSOVER";

  if (macdBullish && rsi.value !== null && rsi.value > 50) return { state: MOMENTUM_STATES.STRONG_BULLISH, rsi, macd };
  if (macdBearish && rsi.value !== null && rsi.value < 50) return { state: MOMENTUM_STATES.STRONG_BEARISH, rsi, macd };
  if (macdBullish) return { state: MOMENTUM_STATES.BULLISH, rsi, macd };
  if (macdBearish) return { state: MOMENTUM_STATES.BEARISH, rsi, macd };

  return { state: MOMENTUM_STATES.NEUTRAL, rsi, macd };
}

module.exports = { analyzeMomentum, MOMENTUM_STATES };
