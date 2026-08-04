// Sprint 38 — Macro Economist committee member.
//
// Responsibilities per mission: rates, inflation, employment, bonds,
// dollar, COT, macro news. Only NEWS and COT are actually wired into the
// evidence matrix today — rates/inflation/employment/bonds/dollar have no
// real integration yet, so they are honestly reported as missing evidence
// rather than invented. Consumes ONLY the evidence matrix passed in; never
// imports a provider or evidenceMatrixService itself.
const { findCategory, isRowAvailable } = require("../evidenceMatrixLookup");
const { buildMemberOutput } = require("../standardMemberOutput");

const UNCOVERED_MACRO_INPUTS = ["rates", "inflation", "employment", "bonds", "dollar"];

function evaluate(evidenceMatrix) {
  const news = findCategory(evidenceMatrix, "NEWS");
  const cot = findCategory(evidenceMatrix, "COT");

  const availableRows = [news, cot].filter(isRowAvailable);
  const supportingEvidence = availableRows
    .filter((row) => row.stance === "SUPPORTIVE")
    .map((row) => ({ category: row.category, reason: row.reason, sourceCount: row.sourceCount }));
  const counterEvidence = availableRows
    .filter((row) => row.stance === "CONTRADICTORY")
    .map((row) => ({ category: row.category, reason: row.strongestCounterEvidence || row.reason }));

  const missingEvidence = [
    ...(isRowAvailable(news) ? [] : [`NEWS: ${news.reason}`]),
    ...(isRowAvailable(cot) ? [] : [`COT: ${cot.reason}`]),
    ...UNCOVERED_MACRO_INPUTS.map((input) => `${input}: not yet wired into the evidence matrix`),
  ];

  const headline = availableRows.length
    ? "Macro evidence available is limited to news and COT positioning; most macro inputs are not yet wired in."
    : "No macro evidence is currently available in the evidence matrix.";

  return buildMemberOutput({
    memberId: "macroEconomist",
    memberName: "Macro Economist",
    headline,
    reasoning: availableRows.length
      ? `Reviewed ${availableRows.length} available macro-relevant row(s) (NEWS, COT) out of the full macro input set the mission names; the rest are honestly unavailable.`
      : "Neither NEWS nor COT evidence is currently available for this symbol.",
    supportingEvidence,
    counterEvidence,
    // Conservative combination (min confidence, max uncertainty) across this
    // member's own rows — never an average, per the mission's "committee
    // never averages scores" constraint.
    confidence: availableRows.length ? Math.min(...availableRows.map((row) => row.confidence)) : 0,
    uncertainty: availableRows.length ? Math.max(...availableRows.map((row) => row.uncertainty)) : 100,
    freshness: cot.newestSource || news.newestSource || "UNKNOWN",
    missingEvidence,
  });
}

module.exports = { evaluate };
