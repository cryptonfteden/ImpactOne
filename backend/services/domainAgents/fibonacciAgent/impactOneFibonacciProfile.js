const IMPACTONE_FIBONACCI_PROFILE = Object.freeze({
  id: "impactone-fibonacci",
  strategyVersion: "impactone-fibonacci-weekly-v2",
  status: "ACTIVE_INTERNAL_STRATEGY",
  sourceOfTruth: "IMPACTONE_CANONICAL_ENGINE",
  anchorDirection: "CHRONOLOGICAL_LOW_TO_LATER_HIGH",
  activeRatios: Object.freeze([0, 0.886, 1]),
  entryZone: Object.freeze({
    targetRatio: 0.886,
    minDistancePct: 0,
    maxDistancePct: 5,
    approachDirection: "FROM_ABOVE",
  }),
  defaultScanTimeframe: "1W",
  allowedWebhookTimeframes: Object.freeze(["15", "15M", "4H", "1D", "1W", "1M"]),
  useOpenCandle: false,
  alertPolicy: "Agent alerts and committee votes use completed weekly candles only. Other timeframes are chart-display tools and never create strategy alerts.",
  disclosure: "ImpactOne internal weekly strategy. This is not TradingView/Pine parity and does not imply a guaranteed trade outcome.",
});

module.exports = { IMPACTONE_FIBONACCI_PROFILE };
