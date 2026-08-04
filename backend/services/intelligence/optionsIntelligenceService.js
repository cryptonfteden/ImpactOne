// Sprint 37 Priority 8 — Equity Options Intelligence.
//
// SAFETY-CRITICAL, explicit mission requirement: "A call purchase must not
// automatically be classified as bullish." A call can be a hedge against a
// short position, part of a spread, or a closing transaction — this module
// only classifies as BULLISH/BEARISH when the input actually disambiguates
// (a sweep/block classification, or an explicit opening-transaction flag);
// otherwise it honestly returns AMBIGUOUS.
function classifyDirectionalBias({ optionType, sweepOrBlock, isOpeningTransaction, isPartOfSpread } = {}) {
  if (isPartOfSpread) return "HEDGING_OR_STRATEGY_AMBIGUOUS";
  if (isOpeningTransaction === false) return "CLOSING_TRANSACTION_AMBIGUOUS";
  if (!sweepOrBlock) return "AMBIGUOUS";

  // Only an aggressive, confirmed-opening sweep/block gets a directional
  // read — and even then it's named as bias, not a verdict.
  if (optionType === "CALL") return "BULLISH_BIAS";
  if (optionType === "PUT") return "BEARISH_BIAS";
  return "AMBIGUOUS";
}

function normalizeOptionsSnapshot(raw = {}) {
  const callVolume = Number.isFinite(raw.callVolume) ? raw.callVolume : null;
  const putVolume = Number.isFinite(raw.putVolume) ? raw.putVolume : null;
  const callPutRatio = Number.isFinite(callVolume) && Number.isFinite(putVolume) && putVolume > 0 ? callVolume / putVolume : null;

  return {
    symbol: raw.symbol || null,
    callVolume,
    putVolume,
    callPutRatio,
    openInterest: Number.isFinite(raw.openInterest) ? raw.openInterest : null,
    impliedVolatility: Number.isFinite(raw.impliedVolatility) ? raw.impliedVolatility : null,
    ivRank: Number.isFinite(raw.ivRank) ? raw.ivRank : null,
    unusualActivity: Boolean(raw.unusualActivity),
    expiration: raw.expiration || null,
    strike: Number.isFinite(raw.strike) ? raw.strike : null,
    premium: Number.isFinite(raw.premium) ? raw.premium : null,
    sweepOrBlock: raw.sweepOrBlock || null, // "SWEEP" | "BLOCK" | null
    gammaExposure: Number.isFinite(raw.gammaExposure) ? raw.gammaExposure : null,
    directionalBias: classifyDirectionalBias(raw),
    isRecommendation: false,
  };
}

// Sprint 37 — real unusual-options-activity data (sweeps/blocks, gamma
// exposure) requires a paid feed (e.g. a specialized options-flow vendor);
// no credential exists in this environment. Deterministic FIXTURE,
// deliberately including one call that looks bullish on the surface but is
// tagged as part of a spread — proving the ambiguity rule actually holds
// rather than defaulting to bullish.
function getFixtureSnapshot(symbol = "NVDA") {
  const obviousCall = normalizeOptionsSnapshot({
    symbol, callVolume: 42_000, putVolume: 18_000, openInterest: 210_000, impliedVolatility: 0.42, ivRank: 68,
    unusualActivity: true, expiration: "2026-08-21", strike: 140, premium: 3.2, sweepOrBlock: "SWEEP", isOpeningTransaction: true, optionType: "CALL",
  });
  const ambiguousSpreadCall = normalizeOptionsSnapshot({
    symbol, callVolume: 15_000, putVolume: 15_500, openInterest: 90_000, impliedVolatility: 0.38, ivRank: 40,
    unusualActivity: false, expiration: "2026-09-18", strike: 150, premium: 2.1, sweepOrBlock: null, isPartOfSpread: true, optionType: "CALL",
  });
  return { status: "FIXTURE", symbol, snapshots: [obviousCall, ambiguousSpreadCall] };
}

module.exports = { classifyDirectionalBias, normalizeOptionsSnapshot, getFixtureSnapshot };
