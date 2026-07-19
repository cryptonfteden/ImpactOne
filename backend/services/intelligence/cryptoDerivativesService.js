// Sprint 37 Priority 7 — Crypto Sentiment and Derivatives.
//
// SAFETY-CRITICAL: never converts a single long/short percentage into a
// trade recommendation. Always surfaces the counter-signal alongside the
// headline number — crowding risk is a first-class field, not an
// afterthought, since a lopsided long/short ratio is itself often a
// contrarian signal, not a confirming one.
function normalizeDerivativesSnapshot(raw = {}) {
  const longPct = Number.isFinite(raw.longPct) ? raw.longPct : null;
  const shortPct = Number.isFinite(raw.shortPct) ? raw.shortPct : null;
  const longShortRatio = Number.isFinite(longPct) && Number.isFinite(shortPct) && shortPct > 0 ? longPct / shortPct : null;

  // Crowding risk: an extreme long/short skew is presented as a
  // CONTRARIAN counter-signal, never as directional confirmation — this
  // is the explicit, required counter-signal the mission names.
  let crowdingRisk = "LOW";
  if (Number.isFinite(longPct)) {
    if (longPct >= 75 || longPct <= 25) crowdingRisk = "HIGH";
    else if (longPct >= 65 || longPct <= 35) crowdingRisk = "MODERATE";
  }

  return {
    symbol: raw.symbol || null,
    longShort: { longPct, shortPct, ratio: longShortRatio },
    fundingRate: Number.isFinite(raw.fundingRate) ? raw.fundingRate : null,
    openInterest: Number.isFinite(raw.openInterest) ? raw.openInterest : null,
    liquidations: {
      longLiquidationsUsd: Number.isFinite(raw.longLiquidationsUsd) ? raw.longLiquidationsUsd : null,
      shortLiquidationsUsd: Number.isFinite(raw.shortLiquidationsUsd) ? raw.shortLiquidationsUsd : null,
      imbalance: Number.isFinite(raw.longLiquidationsUsd) && Number.isFinite(raw.shortLiquidationsUsd) && (raw.longLiquidationsUsd + raw.shortLiquidationsUsd) > 0
        ? (raw.longLiquidationsUsd - raw.shortLiquidationsUsd) / (raw.longLiquidationsUsd + raw.shortLiquidationsUsd)
        : null,
    },
    exchangeDistribution: raw.exchangeDistribution || null,
    // "Sentiment direction" names the crowd's positioning, explicitly
    // distinct from a directional call this module has no authority to
    // make.
    sentimentDirection: Number.isFinite(longPct) ? (longPct > 55 ? "CROWD_LONG" : longPct < 45 ? "CROWD_SHORT" : "BALANCED") : null,
    crowdingRisk,
    dataFreshness: raw.asOf ? { asOf: raw.asOf, ageMinutes: Math.floor((Date.now() - new Date(raw.asOf).getTime()) / 60000) } : null,
    isRecommendation: false,
  };
}

// Sprint 37 — CoinGlass's full data set requires a paid API tier; no
// credential exists in this environment. Deterministic FIXTURE snapshot,
// clearly labeled, structurally identical to what a real CoinGlass
// response would normalize into.
function getFixtureSnapshot(symbol = "BTC") {
  return {
    status: "FIXTURE",
    ...normalizeDerivativesSnapshot({
      symbol,
      longPct: 78,
      shortPct: 22,
      fundingRate: 0.018,
      openInterest: 4_200_000_000,
      longLiquidationsUsd: 12_000_000,
      shortLiquidationsUsd: 41_000_000,
      exchangeDistribution: { Binance: 38, OKX: 21, Bybit: 18, Other: 23 },
      asOf: new Date().toISOString(),
    }),
  };
}

module.exports = { normalizeDerivativesSnapshot, getFixtureSnapshot };
