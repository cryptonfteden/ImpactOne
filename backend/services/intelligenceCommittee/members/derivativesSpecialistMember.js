// Sprint 38 — Derivatives Specialist committee member.
//
// Consumes ONLY the OPTIONS row (options, volatility, gamma, OI, call/put,
// crowding). Explicit mission rule: never call a trade bullish purely
// because calls were bought — the OPTIONS row upstream already enforces
// this (a directional stance requires more than raw call volume), and
// this member never overrides that by inventing its own directional read.
const { findCategory, isRowAvailable } = require("../evidenceMatrixLookup");
const { buildMemberOutput } = require("../standardMemberOutput");

function evaluate(evidenceMatrix) {
  const options = findCategory(evidenceMatrix, "OPTIONS");

  if (!isRowAvailable(options)) {
    return buildMemberOutput({
      memberId: "derivativesSpecialist",
      memberName: "Derivatives Specialist",
      headline: "No usable options-flow evidence is currently available.",
      reasoning: options.reason,
      confidence: 0,
      uncertainty: 100,
      freshness: "UNKNOWN",
      missingEvidence: [`OPTIONS: ${options.reason}`],
    });
  }

  return buildMemberOutput({
    memberId: "derivativesSpecialist",
    memberName: "Derivatives Specialist",
    headline: `Options flow reviewed across ${options.sourceCount} snapshot(s) — stance is ${options.stance}, never inferred from call volume alone.`,
    reasoning: options.reason || "Read from the OPTIONS row of the evidence matrix; directional bias requires confirmed opening sweeps/blocks, not raw call volume.",
    supportingEvidence: options.stance === "SUPPORTIVE" ? [{ category: "OPTIONS", reason: options.reason }] : [],
    counterEvidence: options.strongestCounterEvidence ? [{ category: "OPTIONS", reason: options.strongestCounterEvidence }] : [],
    confidence: options.confidence,
    uncertainty: options.uncertainty,
    freshness: options.isFixture ? "FIXTURE" : options.newestSource || "UNKNOWN",
    missingEvidence: options.isFixture ? ["OPTIONS: live options-flow provider is UNCONFIGURED — this reflects fixture data"] : [],
  });
}

module.exports = { evaluate };
