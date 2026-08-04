// Phase AI-CORE-001 — Claim Intelligence Layer. The canonical Claim
// contract (mission §1) — one strict, composed view. `evidence`/
// `counterEvidence` are ALWAYS derived at read time from the real,
// append-only ClaimEvidence ledger rows (never a second, potentially
// stale copy stored on the Claim row itself) — same "recompute at read
// time" discipline the Intelligence Bus's lifecycleStatus and the
// Sentiment Engine's trend already established.
const { sanitizeClaimView } = require("./claimGovernance");

const REQUIRED_CONTRACT_FIELDS = [
  "claimId",
  "claimType",
  "subject",
  "market",
  "symbols",
  "sectors",
  "regions",
  "statement",
  "plainLanguageStatement",
  "expectedDirection",
  "expectedMagnitude",
  "timeHorizon",
  "probability",
  "confidence",
  "uncertainty",
  "evidence",
  "counterEvidence",
  "assumptions",
  "confirmationConditions",
  "invalidationConditions",
  "portfolioImpact",
  "sourceAgents",
  "provenance",
  "firstObservedAt",
  "lastUpdatedAt",
  "expiresAt",
  "status",
  "resolution",
  "methodologyVersion",
];

function composeEvidenceView(row) {
  return {
    id: row.id,
    intelligenceBusEventId: row.intelligenceBusEventId,
    sourceEngine: row.sourceEngine,
    sourceProvider: row.sourceProvider,
    stance: row.stance,
    observedFact: row.observedFact,
    inference: row.inference,
    freshness: row.freshness,
    confidence: row.confidence,
    independenceGroup: row.independenceGroup,
    contributionToClaim: row.contributionToClaim,
    addedAt: row.addedAt,
  };
}

/**
 * The explicit observed/inferred/predicted/uncertainty separation
 * (mission §1's "clearly distinguish" requirement) — a presentation
 * layer over the same real fields already on the contract, made
 * unambiguous rather than left for a consumer to infer.
 */
function composeReasoningBreakdown(claimRow, evidenceRows) {
  return {
    observed: evidenceRows.map((row) => row.observedFact).filter(Boolean),
    inferred: evidenceRows.map((row) => row.inference).filter(Boolean),
    predicted: {
      statement: claimRow.statement,
      expectedDirection: claimRow.expectedDirection,
      probability: claimRow.probability !== null && claimRow.probability !== undefined ? Number(claimRow.probability) : null,
    },
    uncertainty: {
      score: claimRow.uncertainty !== null && claimRow.uncertainty !== undefined ? Number(claimRow.uncertainty) : null,
      assumptions: claimRow.assumptions || [],
      invalidationConditions: claimRow.invalidationConditions || [],
    },
  };
}

/**
 * Composes the full canonical contract from a persisted Claim row plus
 * its real evidence rows. Always sanitized (governance) regardless of
 * what was persisted.
 */
function composeClaimView(claimRow, evidenceRows = []) {
  const evidence = evidenceRows.filter((row) => row.stance === "SUPPORTS").map(composeEvidenceView);
  const counterEvidence = evidenceRows.filter((row) => row.stance === "CONTRADICTS" || row.stance === "INVALIDATES").map(composeEvidenceView);

  const view = {
    claimId: claimRow.id,
    claimType: claimRow.claimType,
    subject: claimRow.subject,
    market: claimRow.market,
    symbols: claimRow.symbols || [],
    sectors: claimRow.sectors || [],
    regions: claimRow.regions || [],
    statement: claimRow.statement,
    plainLanguageStatement: claimRow.plainLanguageStatement,
    expectedDirection: claimRow.expectedDirection,
    expectedMagnitude: claimRow.expectedMagnitude ?? null,
    timeHorizon: claimRow.timeHorizon,
    probability: claimRow.probability !== null && claimRow.probability !== undefined ? Number(claimRow.probability) : null,
    confidence: claimRow.confidence !== null && claimRow.confidence !== undefined ? Number(claimRow.confidence) : null,
    uncertainty: claimRow.uncertainty !== null && claimRow.uncertainty !== undefined ? Number(claimRow.uncertainty) : null,
    evidence,
    counterEvidence,
    assumptions: claimRow.assumptions || [],
    confirmationConditions: claimRow.confirmationConditions || [],
    invalidationConditions: claimRow.invalidationConditions || [],
    portfolioImpact: claimRow.portfolioImpact ?? null,
    sourceAgents: claimRow.sourceAgents || [],
    provenance: claimRow.provenance,
    firstObservedAt: claimRow.firstObservedAt,
    lastUpdatedAt: claimRow.lastUpdatedAt,
    expiresAt: claimRow.expiresAt ?? null,
    status: claimRow.status,
    resolution: claimRow.resolution ?? null,
    methodologyVersion: claimRow.methodologyVersion,
    reasoning: composeReasoningBreakdown(claimRow, evidenceRows),
  };

  return sanitizeClaimView(view);
}

function validateContractShape(view) {
  const missing = REQUIRED_CONTRACT_FIELDS.filter((field) => !(field in view));
  return { valid: missing.length === 0, missing };
}

module.exports = { REQUIRED_CONTRACT_FIELDS, composeEvidenceView, composeReasoningBreakdown, composeClaimView, validateContractShape };
