// Sprint 38 — Technical Analyst committee member.
//
// Consumes ONLY the TECHNICAL row of the evidence matrix (trend, RSI,
// MACD, VWAP, ATR, Bollinger, Fibonacci, support/resistance, market
// structure — all folded into that row upstream). Never references
// analyst ratings or any other category.
const { findCategory, isRowAvailable } = require("../evidenceMatrixLookup");
const { buildMemberOutput } = require("../standardMemberOutput");

function evaluate(evidenceMatrix) {
  const technical = findCategory(evidenceMatrix, "TECHNICAL");

  if (!isRowAvailable(technical)) {
    return buildMemberOutput({
      memberId: "technicalAnalyst",
      memberName: "Technical Analyst",
      headline: "No reliable technical read is available for this symbol.",
      reasoning: technical.reason,
      confidence: 0,
      uncertainty: 100,
      freshness: "UNKNOWN",
      missingEvidence: [`TECHNICAL: ${technical.reason}`],
    });
  }

  return buildMemberOutput({
    memberId: "technicalAnalyst",
    memberName: "Technical Analyst",
    headline: technical.stance === "CONTRADICTORY"
      ? "Technical signals are internally contradictory — momentum may be overextended."
      : technical.stance === "SUPPORTIVE"
        ? "Technical structure is supportive."
        : "Technical structure is neutral.",
    reasoning: `Trend/RSI-derived read: stance ${technical.stance}, confidence ${technical.confidence}.`,
    supportingEvidence: technical.stance === "SUPPORTIVE" ? [{ category: "TECHNICAL", reason: "Uptrend signal" }] : [],
    counterEvidence: technical.strongestCounterEvidence ? [{ category: "TECHNICAL", reason: technical.strongestCounterEvidence }] : [],
    confidence: technical.confidence,
    uncertainty: technical.uncertainty,
    freshness: technical.isStale ? "STALE" : "CURRENT",
    missingEvidence: technical.isStale ? ["TECHNICAL: last bar is more than 5 days old"] : [],
  });
}

module.exports = { evaluate };
