// Phase SHORT-INTEREST-AGENT-001 — "Borrow utilization", "Borrow fee",
// "Shares on loan" → "Borrow Stress". These are real securities-
// lending metrics reported by specialized, paid vendors (e.g. Ortex,
// S3 Partners, IHS Markit) — no free, real data source exists anywhere
// in this codebase (confirmed by a dedicated research pass). This
// always honestly reports unavailable rather than fabricating a
// borrow-fee or utilization figure — the same "never fabricate,
// honestly report unavailable" discipline this mission itself
// requires, mirroring `fundConcentrationAnalyzer.js`'s (ETF-FLOW-
// AGENT-001) and `stockExposureAnalyzer.js`'s (same phase) precedent.
function analyzeBorrowStress() {
  return {
    dataAvailable: false,
    unavailableReason: "No real securities-lending data source (borrow fee, utilization, shares on loan) is connected in this environment — these are paid-vendor metrics, never fabricated here.",
    utilizationPercent: null,
    borrowFeePercent: null,
    sharesOnLoan: null,
  };
}

module.exports = { analyzeBorrowStress };
