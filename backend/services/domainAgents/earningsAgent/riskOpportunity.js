// Phase EARNINGS-AGENT-001 — real, rule-based Risks/Opportunities lists.
// Every entry fires only on a real, checkable condition already present
// on the already-computed metrics/growth/surprise/consistency/health
// objects — never a speculative or template-filler entry.
function buildRiskOpportunity({ metrics, growth, surprise, consistency, health }) {
  const risks = [];
  const opportunities = [];

  if (!metrics.dataAvailable) {
    risks.push("No real earnings data source is currently available for this symbol — this report cannot assess risk or opportunity beyond that gap.");
    return { risks, opportunities };
  }

  // Growth-related
  if (metrics.revenue.growthYoY !== null && metrics.revenue.growthYoY < 0) {
    risks.push(`Revenue declined ${Math.abs(metrics.revenue.growthYoY).toFixed(1)}% year-over-year.`);
  } else if (metrics.revenue.growthYoY !== null && metrics.revenue.growthYoY > 15) {
    opportunities.push(`Revenue grew ${metrics.revenue.growthYoY.toFixed(1)}% year-over-year, well above a typical single-digit pace.`);
  }
  if (metrics.eps.growthYoY !== null && metrics.eps.growthYoY < 0) {
    risks.push(`EPS declined ${Math.abs(metrics.eps.growthYoY).toFixed(1)}% year-over-year.`);
  } else if (metrics.eps.growthYoY !== null && metrics.eps.growthYoY > 15) {
    opportunities.push(`EPS grew ${metrics.eps.growthYoY.toFixed(1)}% year-over-year.`);
  }

  // Margin-related
  if (metrics.margins.netProfitMargin !== null && metrics.margins.netProfitMargin < 0) {
    risks.push("The company is currently loss-making on a net profit margin basis.");
  } else if (metrics.margins.netProfitMargin !== null && metrics.margins.netProfitMargin > 20) {
    opportunities.push(`Net profit margin of ${metrics.margins.netProfitMargin.toFixed(1)}% indicates real, above-average profitability.`);
  }

  // Surprise/consistency-related
  if (consistency.rating === "LOW") {
    risks.push(`Historical earnings consistency is low (beat rate ${consistency.beatRate !== null ? Math.round(consistency.beatRate * 100) + "%" : "unknown"}) — recent surprises have been unpredictable.`);
  } else if (consistency.rating === "HIGH") {
    opportunities.push(`Historical earnings consistency is high (beat rate ${Math.round(consistency.beatRate * 100)}%, low surprise dispersion).`);
  }
  if (surprise.surpriseScore !== null && surprise.surpriseScore < 35) {
    risks.push("Recent EPS surprises have skewed negative relative to analyst estimates.");
  }

  // Data-gap risks (mirrors OPTIONS-AGENT-001's honesty discipline for
  // fields with no connected data source)
  if (metrics.guidance.direction === null) {
    risks.push("No forward-guidance data source is connected — this report cannot factor in management's own outlook.");
  }
  if (metrics.analystRevisions.direction === null) {
    risks.push("No analyst-revision data source is connected — this report cannot factor in recent estimate changes.");
  }
  if (metrics.cashFlow.freeCashFlowGrowthYoY === null) {
    risks.push("No cash-flow data source is connected — this report's profitability read is based on reported margins only, not cash generation.");
  }

  // Health-driven
  if (health.earningsHealth === "STRONG") {
    opportunities.push("Overall earnings health is rated STRONG across the available margin, growth, and consistency signals.");
  } else if (health.earningsHealth === "WEAK") {
    risks.push("Overall earnings health is rated WEAK across the available margin, growth, and consistency signals.");
  }

  if (!risks.length) risks.push("No specific elevated risks were flagged from the available data this window.");
  if (!opportunities.length) opportunities.push("No specific standout opportunities were flagged from the available data this window.");

  return { risks, opportunities };
}

module.exports = { buildRiskOpportunity };
