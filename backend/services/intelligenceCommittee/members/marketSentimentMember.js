// Sprint 38 — Market Sentiment Specialist committee member.
//
// Consumes ONLY the SENTIMENT row (CoinGlass-style funding/crowding data,
// folded into that row upstream by cryptoDerivativesService). No Fear &
// Greed Index integration exists anywhere in this codebase — reported
// honestly as missing evidence rather than fabricated.
const { findCategory, isRowAvailable } = require("../evidenceMatrixLookup");
const { buildMemberOutput } = require("../standardMemberOutput");

function evaluate(evidenceMatrix) {
  const sentiment = findCategory(evidenceMatrix, "SENTIMENT");
  const missingEvidence = ["Fear & Greed Index: no provider integration exists yet"];

  if (!isRowAvailable(sentiment)) {
    return buildMemberOutput({
      memberId: "marketSentimentSpecialist",
      memberName: "Market Sentiment Specialist",
      headline: "No sentiment/derivatives-positioning evidence is currently available.",
      reasoning: sentiment.reason,
      confidence: 0,
      uncertainty: 100,
      freshness: "UNKNOWN",
      missingEvidence: [`SENTIMENT: ${sentiment.reason}`, ...missingEvidence],
    });
  }

  return buildMemberOutput({
    memberId: "marketSentimentSpecialist",
    memberName: "Market Sentiment Specialist",
    headline: sentiment.stance === "CONTRADICTORY"
      ? "Positioning is crowded — a contrarian counter-signal, not confirmation."
      : "Positioning is not currently at a crowding extreme.",
    reasoning: sentiment.reason || "Read from the SENTIMENT row of the evidence matrix (funding/long-short skew).",
    supportingEvidence: [],
    counterEvidence: sentiment.strongestCounterEvidence ? [{ category: "SENTIMENT", reason: sentiment.strongestCounterEvidence }] : [],
    confidence: sentiment.confidence,
    uncertainty: sentiment.uncertainty,
    freshness: sentiment.isFixture ? "FIXTURE" : sentiment.newestSource || "UNKNOWN",
    missingEvidence: sentiment.isFixture ? ["SENTIMENT: this reflects fixture data, not a live CoinGlass feed", ...missingEvidence] : missingEvidence,
  });
}

module.exports = { evaluate };
