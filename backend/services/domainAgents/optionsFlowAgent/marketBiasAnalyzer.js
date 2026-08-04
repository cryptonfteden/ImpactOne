// Phase OPTIONS-AGENT-001 — a pure, deterministic scoring function: no
// ML model, no LLM call, every input a real number already present on
// OptionsMetrics (optionsDataProvider.js), every weight documented
// below. Consistent with this project's established preference for
// deterministic, explainable scoring over an opaque model (the same
// choice investorProfileService and optionsAnomalyConfidence already
// made) — anyone can trace a bias/confidence back to the exact real
// inputs that produced it.
const MIN_MEANINGFUL_VOLUME = 20; // below this, volume signals are too thin to weight heavily

/**
 * @param {import("./optionsDataProvider").OptionsMetrics} metrics
 * @returns {{ bias: "BULLISH"|"BEARISH"|"NEUTRAL", confidence: number, score: number, contributions: object }}
 */
function analyzeMarketBias(metrics) {
  if (!metrics?.dataAvailable) {
    return { bias: "NEUTRAL", confidence: 0, score: 0, contributions: {} };
  }

  const contributions = {};
  let score = 0; // positive => bullish lean, negative => bearish lean
  let weightUsed = 0;

  // 1. Put/Call volume ratio — the single most direct signal. A ratio
  // below 1 (more call volume than put volume) leans bullish; above 1
  // leans bearish. Weighted by how far from 1.0 it sits, capped so one
  // extreme reading can't alone saturate the score.
  if (metrics.putCallRatio !== null && metrics.optionVolume.total >= MIN_MEANINGFUL_VOLUME) {
    const deviation = 1 - metrics.putCallRatio; // >0 bullish (fewer puts), <0 bearish
    const clamped = Math.max(-1, Math.min(1, deviation));
    const contribution = clamped * 40;
    contributions.putCallRatio = contribution;
    score += contribution;
    weightUsed += 40;
  }

  // 2. Call/put skew Z-score (from the existing, already-tested
  // detectCallPutSkew detector) — a real statistical deviation from this
  // symbol's own baseline, not just today's raw ratio. Positive
  // (BULLISH_LEANING) adds, negative (BEARISH_LEANING) subtracts.
  if (metrics.skew?.putCallSkewZScore !== null && metrics.skew?.putCallSkewZScore !== undefined) {
    const clamped = Math.max(-3, Math.min(3, metrics.skew.putCallSkewZScore));
    const contribution = (clamped / 3) * 30;
    contributions.skew = contribution;
    score += contribution;
    weightUsed += 30;
  }

  // 3. Large block trade aggressor side — real institutional-size prints
  // (already flagged by the existing block detector), split by whether
  // the buying pressure sat on calls or puts.
  if (metrics.largeBlockTrades.length) {
    let bullishNotional = 0;
    let bearishNotional = 0;
    for (const trade of metrics.largeBlockTrades) {
      const notional = Number(trade.notionalValue) || 0;
      const isBullish = (trade.optionType === "CALL" && trade.aggressorSide === "BUY") || (trade.optionType === "PUT" && trade.aggressorSide === "SELL");
      const isBearish = (trade.optionType === "PUT" && trade.aggressorSide === "BUY") || (trade.optionType === "CALL" && trade.aggressorSide === "SELL");
      if (isBullish) bullishNotional += notional;
      else if (isBearish) bearishNotional += notional;
    }
    const totalNotional = bullishNotional + bearishNotional;
    if (totalNotional > 0) {
      const balance = (bullishNotional - bearishNotional) / totalNotional; // -1..1
      const contribution = balance * 30;
      contributions.blockTradeFlow = contribution;
      score += contribution;
      weightUsed += 30;
    }
  }

  if (weightUsed === 0) {
    // Real data existed, but none of it cleared the thresholds above to
    // be meaningful (e.g. thin volume, no skew signal, no block trades)
    // — honestly NEUTRAL, not a fabricated lean from noise.
    return { bias: "NEUTRAL", confidence: 0, score: 0, contributions };
  }

  const normalizedScore = score / weightUsed; // -1..1
  const confidence = Math.round(Math.min(100, Math.abs(normalizedScore) * 100 * (weightUsed / 100) + Math.abs(normalizedScore) * 40));
  const NEUTRAL_BAND = 0.08; // within +/-8% of dead-center counts as no real lean

  let bias = "NEUTRAL";
  if (normalizedScore > NEUTRAL_BAND) bias = "BULLISH";
  else if (normalizedScore < -NEUTRAL_BAND) bias = "BEARISH";

  return {
    bias,
    confidence: bias === "NEUTRAL" ? Math.min(confidence, 40) : Math.min(100, Math.max(0, confidence)),
    score: normalizedScore,
    contributions,
  };
}

module.exports = { analyzeMarketBias, MIN_MEANINGFUL_VOLUME };
