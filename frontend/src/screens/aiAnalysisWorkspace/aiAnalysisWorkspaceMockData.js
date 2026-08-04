// Phase AI-ANALYSIS-001 — fallback-only data for the AI Analysis
// Workspace, used ONLY when the real fetch it stands in for fails.
// Every field mirrors the real Claim contract already established by
// claimContract.js's composeClaimView (evidence/counterEvidence/
// invalidationConditions/confirmationConditions/reasoning) and
// claimConsumerService.js's getStrongestEvidence/getClaimHistory — demo
// content standing in for real intelligence, never a new data model.

export const fallbackClaim = {
  claimId: "demo-analysis-1",
  claimType: "EARNINGS_REACTION",
  subject: "NVDA",
  symbols: ["NVDA"],
  statement: "NVDA demand outpaces supply through Q3, constraining near-term upside.",
  plainLanguageStatement: "NVDA looks set to keep beating expectations — the real constraint right now is capacity, not demand.",
  expectedDirection: "BULLISH",
  probability: 78,
  confidence: 88,
  uncertainty: 22,
  status: "STRENGTHENING",
  evidence: [
    { id: "e1", observedFact: "Two independent supplier disclosures confirm capacity remains the binding constraint.", inference: "Demand is not the limiting factor this quarter." },
    { id: "e2", observedFact: "Analyst revisions this week moved uniformly upward.", inference: "Sell-side consensus is converging, not diverging." },
  ],
  counterEvidence: [
    { id: "e3", observedFact: "One regional distributor reported a modest order pushback.", inference: "A small, localized demand softening cannot yet be ruled out." },
  ],
  assumptions: ["Capacity expansion proceeds on the currently disclosed timeline."],
  confirmationConditions: ["Next earnings call reaffirms the current capacity guidance.", "A third independent supplier confirms the same constraint."],
  invalidationConditions: ["A supplier discloses spare capacity materially above current guidance.", "Two or more regions report simultaneous order pushbacks."],
  portfolioImpact: { magnitude: 74, direction: "positive" },
  reasoning: {
    observed: ["Two independent supplier disclosures confirm capacity remains the binding constraint.", "Analyst revisions this week moved uniformly upward."],
    inferred: ["Demand is not the limiting factor this quarter.", "Sell-side consensus is converging, not diverging."],
    predicted: { statement: "NVDA demand outpaces supply through Q3, constraining near-term upside.", expectedDirection: "BULLISH", probability: 78 },
    uncertainty: { score: 22, assumptions: ["Capacity expansion proceeds on the currently disclosed timeline."], invalidationConditions: ["A supplier discloses spare capacity materially above current guidance.", "Two or more regions report simultaneous order pushbacks."] },
  },
  lastUpdatedAt: "2026-07-26T18:00:00.000Z",
  attentionScore: 91,
};

export const fallbackTransitions = [
  { id: "t1", fromStatus: "DRAFT", toStatus: "STRENGTHENING", occurredAt: "2026-07-25T09:00:00.000Z", reason: "A second independent supplier disclosure corroborated the original thesis." },
];

export const fallbackStrongestEvidence = {
  strongestSupporting: fallbackClaim.evidence,
  strongestContradicting: fallbackClaim.counterEvidence,
};
