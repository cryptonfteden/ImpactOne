// Phase ETF-FLOW-AGENT-001 — "Fund concentration" (top-holdings
// weighting). No real, licensed ETF holdings-weight data source is
// connected in this environment (confirmed by a dedicated research
// pass — services/providers/definitions/spdrProvider.js is an honest
// stub for exactly this reason). This always honestly reports
// unavailable rather than fabricating a concentration figure — the
// same "never fabricate, honestly report unavailable" discipline this
// mission itself requires.
function analyzeFundConcentration() {
  return {
    dataAvailable: false,
    unavailableReason: "No real ETF holdings-weight data source is connected in this environment — fund concentration cannot be honestly computed.",
    topHoldingsWeightPercent: null,
  };
}

module.exports = { analyzeFundConcentration };
