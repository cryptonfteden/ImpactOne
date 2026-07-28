// Phase VALUATION-AGENT-001 — implements VALUATION_SCORING_MODEL.md §2's
// exact rule: "exclude, never compute-and-display a nonsensical value."
// Pure function, no I/O — decides, for one company's real metrics,
// which of the 7 methods are structurally applicable at all, before any
// price/scoring math runs. Every exclusion carries a real, disclosed
// reason (VALUATION_SCORING_MODEL.md §2.4's `excludedMethods` requirement).
const ALL_METHODS = ["PE", "FORWARD_PE", "PEG", "EV_EBITDA", "PS", "PB", "FCF_YIELD"];

function isUsablePositive(value) {
  return Number.isFinite(value) && value > 0;
}

/**
 * @param {import("./valuationDataProvider").ValuationMetrics} metrics
 * @returns {{ applicableMethods: string[], excludedMethods: Array<{method: string, reason: string}> }}
 */
function determineApplicableMethods(metrics) {
  const excludedMethods = [];
  const applicableMethods = [];

  // P/E — VALUATION_SCORING_MODEL.md §2.1: never computed for EPS <= 0.
  if (isUsablePositive(metrics.eps.trailing)) {
    applicableMethods.push("PE");
  } else {
    excludedMethods.push({ method: "PE", reason: metrics.eps.trailing === null ? "Trailing EPS is unavailable." : "Trailing EPS is zero or negative — a P/E computed from it would be meaningless." });
  }

  // Forward P/E — computed independently of trailing P/E's own exclusion,
  // since a company can have negative trailing EPS but a positive
  // forward estimate, or vice versa (§2.1).
  if (isUsablePositive(metrics.eps.forward)) {
    applicableMethods.push("FORWARD_PE");
  } else {
    excludedMethods.push({ method: "FORWARD_PE", reason: metrics.eps.forward === null ? "Forward EPS estimate is unavailable." : "Forward EPS estimate is zero or negative — a Forward P/E computed from it would be meaningless." });
  }

  // PEG — depends on P/E (excluded whenever P/E is excluded) AND a real,
  // positive growth rate (§2.1: "undefined/misleading for negative P/E
  // or negative/near-zero growth").
  if (applicableMethods.includes("PE") && isUsablePositive(metrics.epsGrowthYoY)) {
    applicableMethods.push("PEG");
  } else if (!applicableMethods.includes("PE")) {
    excludedMethods.push({ method: "PEG", reason: "PEG depends on trailing P/E, which is itself excluded for this company." });
  } else {
    excludedMethods.push({ method: "PEG", reason: metrics.epsGrowthYoY === null ? "EPS growth rate is unavailable." : "EPS growth rate is zero or negative — PEG would be undefined/misleading." });
  }

  // EV/EBITDA — usable only if EBITDA itself is positive (§2.2 item 4).
  if (isUsablePositive(metrics.ebitdaPerShare)) {
    applicableMethods.push("EV_EBITDA");
  } else {
    excludedMethods.push({ method: "EV_EBITDA", reason: metrics.ebitdaPerShare === null ? "EBITDA per share is unavailable." : "EBITDA is zero or negative — EV/EBITDA would be meaningless." });
  }

  // Price/Sales — always computable as long as revenue is positive
  // (§2.2 item 2) — true for almost every real operating company.
  if (isUsablePositive(metrics.revenuePerShare)) {
    applicableMethods.push("PS");
  } else {
    excludedMethods.push({ method: "PS", reason: metrics.revenuePerShare === null ? "Revenue per share is unavailable." : "Revenue per share is zero or negative." });
  }

  // Price/Book — usable if book value is meaningfully positive (§2.2 item 3).
  if (isUsablePositive(metrics.bookValuePerShare)) {
    applicableMethods.push("PB");
  } else {
    excludedMethods.push({ method: "PB", reason: metrics.bookValuePerShare === null ? "Book value per share is unavailable." : "Book value per share is zero or negative." });
  }

  // FCF Yield — the single best fallback for negative-earnings
  // companies, but only when FCF is itself actually positive (§2.2 item 1).
  if (isUsablePositive(metrics.fcfPerShare)) {
    applicableMethods.push("FCF_YIELD");
  } else {
    excludedMethods.push({ method: "FCF_YIELD", reason: metrics.fcfPerShare === null ? "Free cash flow per share is unavailable." : "Free cash flow is zero or negative." });
  }

  return { applicableMethods, excludedMethods };
}

module.exports = { determineApplicableMethods, ALL_METHODS };
