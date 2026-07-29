// Phase UNIFIED-STOCK-INTELLIGENCE-001 — normalizes each domain agent's
// own real, rich report (options/earnings/valuation each use their own
// vocabulary — marketBias, forwardOutlook, valuationStatus) onto ONE
// common polarity scale (BULLISH/NEUTRAL/BEARISH) plus a common
// risks/opportunities shape. This mapping is deliberately a separate,
// explicit step: the Agent Orchestrator's own `direction` field is
// opaque by design (it never interprets agent content — see
// agentOrchestrator.js's own "the orchestrator never inspects an
// agent's summary/raw content" test) and its generic conflict detector
// only compares raw strings for equality — it would never notice that
// options' "BULLISH", earnings' "POSITIVE", and valuation's
// "UNDERVALUED" all mean the same real thing, or that valuation's
// "OVERVALUED" and earnings' "POSITIVE" are a genuine semantic
// disagreement despite being different strings for an unrelated
// reason. This engine needs real semantic understanding across three
// different domain vocabularies, so it maps each into the shared scale
// itself — the one place in this codebase that is allowed to interpret
// what a domain agent's own real fields mean, since aggregating exactly
// this is this engine's whole job.
function toPolarity(agentId, raw) {
  switch (agentId) {
    case "options": {
      if (raw.marketBias === "BULLISH") return "BULLISH";
      if (raw.marketBias === "BEARISH") return "BEARISH";
      return "NEUTRAL";
    }
    case "earnings": {
      if (raw.forwardOutlook === "POSITIVE") return "BULLISH";
      if (raw.forwardOutlook === "NEGATIVE") return "BEARISH";
      return "NEUTRAL"; // NEUTRAL or UNKNOWN both mean "no real lean"
    }
    case "valuation": {
      // Trading below fair value is the bullish setup (cheap relative to
      // estimate); trading above is the bearish setup — this is a
      // documented, deliberate interpretation, not an accident: a
      // valuation signal describes a price-to-estimate relationship
      // (FAIR_VALUE_METHODOLOGY.md §4), which this engine reads as a
      // directional lean for aggregation purposes only.
      if (raw.valuationStatus === "UNDERVALUED") return "BULLISH";
      if (raw.valuationStatus === "OVERVALUED") return "BEARISH";
      return "NEUTRAL"; // FAIRLY_VALUED or UNKNOWN
    }
    default:
      return "NEUTRAL";
  }
}

function extractRisksAndOpportunities(agentId, raw) {
  if (agentId === "earnings") {
    return { risks: [...raw.risks], opportunities: [...raw.opportunities] };
  }
  if (agentId === "options") {
    const risks = [...raw.riskSummary.notes];
    const opportunities = [];
    if (raw.signals.institutionalActivity.detected) {
      opportunities.push(`Real institutional-sized options activity detected (${raw.signals.institutionalActivity.contractCount} block/sweep signal(s)).`);
    }
    return { risks, opportunities };
  }
  if (agentId === "valuation") {
    const risks = raw.excludedMethods.map((entry) => `${entry.method.replace(/_/g, "/")} valuation method unavailable: ${entry.reason}`);
    if (raw.attractiveRangeCaveat) risks.push(raw.attractiveRangeCaveat);
    const opportunities = [];
    if (raw.highMarginOfSafety) {
      opportunities.push(`Trades at a large, well-corroborated discount to its estimated fair value (${Math.round((raw.discountToFairValue || 0) * 100)}%) with genuine ROIC-based value-creation evidence.`);
    } else if (raw.attractiveRange) {
      opportunities.push(`Trades at a real discount to its estimated fair value (${Math.round((raw.discountToFairValue || 0) * 100)}%).`);
    }
    return { risks, opportunities };
  }
  return { risks: [], opportunities: [] };
}

/**
 * @param {object} agentResult - one entry from agentOrchestrator.run()'s
 *   `report.agents` array (agentId, agentName, status, result, confidence, health)
 * @returns {{
 *   agentId: string, agentName: string, available: boolean,
 *   direction: "BULLISH"|"NEUTRAL"|"BEARISH"|null, confidence: number,
 *   summary: string|null, risks: string[], opportunities: string[],
 *   unavailableReason: string|null
 * }}
 */
function mapAgentResult(agentResult) {
  const available = agentResult.status === "fulfilled" && agentResult.result?.raw?.dataAvailable === true;

  const priority = Number.isFinite(agentResult.priority) ? agentResult.priority : 1;

  if (!available) {
    const unavailableReason =
      agentResult.status !== "fulfilled"
        ? agentResult.error || `Agent status: ${agentResult.status}.`
        : agentResult.result?.raw?.unavailableReason || "No data available.";
    return {
      agentId: agentResult.agentId,
      agentName: agentResult.agentName,
      available: false,
      direction: null,
      confidence: 0,
      priority,
      summary: agentResult.result?.summary ?? null,
      risks: [],
      opportunities: [],
      unavailableReason,
    };
  }

  const raw = agentResult.result.raw;
  const { risks, opportunities } = extractRisksAndOpportunities(agentResult.agentId, raw);

  return {
    agentId: agentResult.agentId,
    agentName: agentResult.agentName,
    available: true,
    direction: toPolarity(agentResult.agentId, raw),
    confidence: Number.isFinite(agentResult.confidence) ? agentResult.confidence : 0,
    priority,
    summary: agentResult.result.summary,
    risks,
    opportunities,
    unavailableReason: null,
  };
}

module.exports = { mapAgentResult, toPolarity, extractRisksAndOpportunities };
