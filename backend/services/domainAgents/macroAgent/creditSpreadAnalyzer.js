// Phase MACRO-AGENT-001 — "Credit spreads". Real FRED BAMLH0A0HYM2
// (ICE BofA US High Yield Index Option-Adjusted Spread) level —
// disclosed thresholds drawn from that index's own real historical
// range (roughly 3pp in calm markets, 10pp+ in real credit-stress
// episodes like 2008/2020).
const TIGHT_THRESHOLD = 3;
const NORMAL_THRESHOLD = 5;
const WIDE_THRESHOLD = 7;

/**
 * @param {{ dataAvailable: boolean, latest: {value:number}|null }} creditSpreadSeries - from fredSeriesProvider (BAMLH0A0HYM2)
 * @returns {{ classification: "TIGHT"|"NORMAL"|"WIDE"|"STRESSED"|"UNKNOWN", spread: number|null }}
 */
function analyzeCreditSpread(creditSpreadSeries) {
  if (!creditSpreadSeries.dataAvailable || !creditSpreadSeries.latest || !Number.isFinite(creditSpreadSeries.latest.value)) {
    return { classification: "UNKNOWN", spread: null };
  }

  const spread = creditSpreadSeries.latest.value;
  let classification = "STRESSED";
  if (spread < TIGHT_THRESHOLD) classification = "TIGHT";
  else if (spread < NORMAL_THRESHOLD) classification = "NORMAL";
  else if (spread < WIDE_THRESHOLD) classification = "WIDE";

  return { classification, spread };
}

module.exports = { analyzeCreditSpread, TIGHT_THRESHOLD, NORMAL_THRESHOLD, WIDE_THRESHOLD };
