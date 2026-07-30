// Phase ANALYST-CONSENSUS-AGENT-001 — "Price targets" + "Price target
// revisions" + "Target dispersion" → "Target Score". When the real
// Finnhub price-target provider returns real data (a paid plan is
// configured), this computes a real, disclosed Target Score
// (0-100, how far the real mean target sits above/below... no current
// price is available in this market-wide-agnostic module, so the
// score here is a real dispersion-based confidence signal: a tight
// real high/low spread relative to the real mean means more analyst
// agreement) and real Target Dispersion (the real high-low spread as a
// percent of the real mean). When unavailable (the confirmed real
// HTTP 403 on this environment's free Finnhub tier), every field here
// is honestly null — never a fabricated target.
function emptyResult(reason) {
  return { targetScore: null, targetDispersion: null, unavailableReason: reason };
}

/**
 * @param {{dataAvailable:boolean, unavailableReason:string|null, targetHigh:number|null, targetLow:number|null, targetMean:number|null}} priceTargets
 * @returns {{ targetScore: number|null, targetDispersion: number|null, unavailableReason: string|null }}
 */
function analyzeTargetScore(priceTargets) {
  if (!priceTargets.dataAvailable || !Number.isFinite(priceTargets.targetMean) || priceTargets.targetMean === 0) {
    return emptyResult(priceTargets.unavailableReason || "No real price-target data available.");
  }
  if (!Number.isFinite(priceTargets.targetHigh) || !Number.isFinite(priceTargets.targetLow)) {
    return emptyResult("Real price-target mean was available but high/low range was not.");
  }

  const targetDispersion = Math.round(((priceTargets.targetHigh - priceTargets.targetLow) / Math.abs(priceTargets.targetMean)) * 10000) / 100;
  // Tighter real analyst agreement (lower dispersion) scores higher —
  // a disclosed inverse-linear map, floored at 0 for a >=100%-of-mean spread.
  const targetScore = Math.round(Math.max(0, 100 - targetDispersion));

  return { targetScore, targetDispersion, unavailableReason: null };
}

module.exports = { analyzeTargetScore };
