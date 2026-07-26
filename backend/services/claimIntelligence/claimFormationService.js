// Phase AI-CORE-001 — Claim Intelligence Layer. Consumes real
// Intelligence Bus events (mission §11: only "options"/"sentiment" this
// phase) and forms/updates Claims. This is the one orchestration point
// tying together identity, evidence, confidence/probability, lifecycle,
// and governance — every sub-decision is delegated to its own pure,
// tested module; this file only sequences them.
const { computeIdentityKey, isOpposingDirection } = require("./claimIdentity");
const { buildEvidenceCandidateFromBusEvent, computeStance } = require("./claimEvidenceLedger");
const { aggregateConfidence, aggregateProbability, applyBoundedConfidenceUpdate, applyBoundedProbabilityUpdate, computeUncertainty } = require("./claimConfidence");
const { acceptsNewEvidence, computeNextStatusAfterEvidence } = require("./claimLifecycle");
const { assertNoGovernanceViolation } = require("./claimGovernance");
const { METHODOLOGY_VERSION, MIN_EVIDENCE_BREADTH_FOR_ACTIVE } = require("./claimDimensions");
const repository = require("./claimRepository");

const CLAIM_TYPE = "DIRECTIONAL_FORECAST";

// Real, disclosed, approximate expiry horizons per reused TimeWindow
// value — see CLAIM_LIFECYCLE.md §4 for the full reasoning.
const HORIZON_DURATION_MS = {
  D1: 2 * 24 * 60 * 60 * 1000,
  W1: 9 * 24 * 60 * 60 * 1000,
  M1: 35 * 24 * 60 * 60 * 1000,
  M3: 100 * 24 * 60 * 60 * 1000,
  M6: 190 * 24 * 60 * 60 * 1000,
  Y1: 380 * 24 * 60 * 60 * 1000,
};

function computeExpiresAt(timeHorizon, firstObservedAt) {
  const durationMs = HORIZON_DURATION_MS[timeHorizon] || HORIZON_DURATION_MS.D1;
  return new Date(firstObservedAt.getTime() + durationMs);
}

function buildPlainLanguageStatement(subject, direction, observedFact) {
  const directionWord = direction === "BULLISH" ? "rise" : direction === "BEARISH" ? "fall" : "stay roughly flat";
  return `${subject} looks more likely to ${directionWord} in the near term. ${observedFact}`;
}

async function recomputeAndPersist(claim, allEvidenceRows, { now, triggeringEvidenceId, invalidationTriggered = false }) {
  const { confidence: newConfidenceRaw, components } = aggregateConfidence(allEvidenceRows);
  const { probability: newProbabilityRaw } = aggregateProbability(allEvidenceRows);

  const confidence = applyBoundedConfidenceUpdate(claim.confidence, newConfidenceRaw);
  const probability = applyBoundedProbabilityUpdate(claim.probability, newProbabilityRaw);
  const uncertainty = computeUncertainty(components.agreement);

  const confidenceDelta = Number.isFinite(confidence) && Number.isFinite(claim.confidence) ? confidence - claim.confidence : Number.isFinite(confidence) ? confidence : 0;

  const nextStatus = computeNextStatusAfterEvidence({
    currentStatus: claim.status,
    evidenceCount: allEvidenceRows.length,
    confidenceDelta,
    evidenceAgreementPct: components.agreement,
    invalidationTriggered,
  });

  const sourceAgents = [...new Set([...(claim.sourceAgents || []), ...allEvidenceRows.map((row) => row.sourceEngine)])];

  const updated = await repository.updateClaimScalars(claim.id, { confidence, probability, uncertainty, status: nextStatus, sourceAgents });

  if (nextStatus !== claim.status) {
    await repository.createTransition({
      claimId: claim.id,
      fromStatus: claim.status,
      toStatus: nextStatus,
      reason: invalidationTriggered
        ? "A real invalidation condition was triggered."
        : `Recomputed from ${allEvidenceRows.length} evidence entries — confidence ${claim.confidence ?? "null"} -> ${confidence ?? "null"}, agreement ${components.agreement ?? "null"}%.`,
      triggeringEvidenceId: triggeringEvidenceId || null,
    });
  }

  return updated;
}

/**
 * The one entry point: consumes one real Bus event. Returns `null` for
 * an event this phase doesn't integrate (non-options/sentiment engine,
 * or a NEUTRAL-direction event with no informative directional content)
 * — a routine, expected outcome, never an error.
 */
async function ingestBusEvent(busEvent, { now = new Date() } = {}) {
  const candidate = buildEvidenceCandidateFromBusEvent(busEvent, { now });
  if (!candidate || candidate.evidenceDirection === "NEUTRAL") {
    return null;
  }

  const identityKey = computeIdentityKey({
    subject: candidate.subject,
    expectedDirection: candidate.evidenceDirection,
    timeHorizon: candidate.timeHorizon,
    symbols: candidate.symbols,
    sectors: [],
    regions: [],
    causalContext: candidate.causalContext,
  });

  const existing = await repository.findByIdentityKey(identityKey);

  if (existing) {
    if (!acceptsNewEvidence(existing.status)) {
      return { claim: existing, action: "ignored_terminal_claim" };
    }
    const stance = computeStance(candidate.evidenceDirection, existing.expectedDirection); // always SUPPORTS here — same identity implies same direction
    assertNoGovernanceViolation(candidate);
    const evidenceRow = await repository.createEvidence({
      claimId: existing.id,
      intelligenceBusEventId: candidate.intelligenceBusEventId,
      sourceEngine: candidate.sourceEngine,
      sourceProvider: candidate.sourceProvider,
      stance,
      observedFact: candidate.observedFact,
      inference: candidate.inference,
      freshness: candidate.freshness,
      confidence: candidate.confidence,
      independenceGroup: candidate.independenceGroup,
      contributionToClaim: null,
    });
    const allEvidence = await repository.listEvidenceForClaim(existing.id);
    const updated = await recomputeAndPersist(existing, allEvidence, { now, triggeringEvidenceId: evidenceRow.id });
    return { claim: updated, action: "updated" };
  }

  // No matching claim — check for a directly contradictory claim
  // (mission §4: same subject/horizon/symbols, opposite direction). It
  // is NEVER merged; the new claim is still created independently. The
  // opposing claim additionally receives this new evidence as real
  // counter-evidence against IT, and may become CONTESTED as a result.
  const sameSeries = await repository.listOpenBySubjectHorizon({ subject: candidate.subject, timeHorizon: candidate.timeHorizon, symbols: candidate.symbols });
  const contradicting = sameSeries.filter((claim) => isOpposingDirection(claim.expectedDirection, candidate.evidenceDirection));

  for (const opposingClaim of contradicting) {
    // eslint-disable-next-line no-await-in-loop
    const evidenceRow = await repository.createEvidence({
      claimId: opposingClaim.id,
      intelligenceBusEventId: candidate.intelligenceBusEventId,
      sourceEngine: candidate.sourceEngine,
      sourceProvider: candidate.sourceProvider,
      stance: "CONTRADICTS",
      observedFact: candidate.observedFact,
      inference: candidate.inference,
      freshness: candidate.freshness,
      confidence: candidate.confidence,
      independenceGroup: candidate.independenceGroup,
      contributionToClaim: null,
    });
    // eslint-disable-next-line no-await-in-loop
    const allEvidence = await repository.listEvidenceForClaim(opposingClaim.id);
    // eslint-disable-next-line no-await-in-loop
    await recomputeAndPersist(opposingClaim, allEvidence, { now, triggeringEvidenceId: evidenceRow.id });
  }

  const firstObservedAt = now;
  const newClaim = await repository.createClaim({
    claimType: CLAIM_TYPE,
    subject: candidate.subject,
    market: null,
    symbols: candidate.symbols,
    sectors: [],
    regions: [],
    statement: `${candidate.subject} is expected to trend ${candidate.evidenceDirection.toLowerCase()} over the ${candidate.timeHorizon} horizon.`,
    plainLanguageStatement: buildPlainLanguageStatement(candidate.subject, candidate.evidenceDirection, candidate.observedFact),
    expectedDirection: candidate.evidenceDirection,
    expectedMagnitude: null, // honestly null — no real magnitude estimate is derived from a single evidence entry
    timeHorizon: candidate.timeHorizon,
    probability: null, // a DRAFT claim with one evidence entry has no real directional sample to compute a probability from yet
    confidence: null,
    uncertainty: null,
    assumptions: [],
    confirmationConditions: [`${candidate.subject} continues to show ${candidate.evidenceDirection.toLowerCase()}-consistent evidence through the ${candidate.timeHorizon} horizon.`],
    invalidationConditions: [`Real evidence emerges showing the opposite (${candidate.evidenceDirection === "BULLISH" ? "bearish" : "bullish"}) direction, or the underlying signal reverses.`],
    portfolioImpact: null, // not wired to real portfolio data this phase — disclosed limitation, never fabricated
    sourceAgents: [candidate.sourceEngine],
    provenance: { sourceEngine: candidate.sourceEngine, sourceProvider: candidate.sourceProvider, intelligenceBusEventId: candidate.intelligenceBusEventId },
    identityKey,
    firstObservedAt,
    expiresAt: computeExpiresAt(candidate.timeHorizon, firstObservedAt),
    status: "DRAFT",
    resolution: null,
    methodologyVersion: METHODOLOGY_VERSION,
  });

  assertNoGovernanceViolation(candidate);
  await repository.createEvidence({
    claimId: newClaim.id,
    intelligenceBusEventId: candidate.intelligenceBusEventId,
    sourceEngine: candidate.sourceEngine,
    sourceProvider: candidate.sourceProvider,
    stance: "SUPPORTS",
    observedFact: candidate.observedFact,
    inference: candidate.inference,
    freshness: candidate.freshness,
    confidence: candidate.confidence,
    independenceGroup: candidate.independenceGroup,
    contributionToClaim: null,
  });
  await repository.createTransition({ claimId: newClaim.id, fromStatus: null, toStatus: "DRAFT", reason: "Claim created from the first real evidence entry.", triggeringEvidenceId: null });

  // A brand-new claim always starts DRAFT with 1 evidence entry — never
  // promoted to ACTIVE until MIN_EVIDENCE_BREADTH_FOR_ACTIVE is real
  // (mission §3). Recompute here only confirms/records that DRAFT stays
  // DRAFT — never a silent skip of the same audit trail a later,
  // qualifying update gets.
  const allEvidence = await repository.listEvidenceForClaim(newClaim.id);
  if (allEvidence.length >= MIN_EVIDENCE_BREADTH_FOR_ACTIVE) {
    const promoted = await recomputeAndPersist(newClaim, allEvidence, { now });
    return { claim: promoted, action: "created" };
  }

  return { claim: newClaim, action: "created" };
}

/**
 * The explicit, real invalidation-trigger wiring point (mission §2/§6) —
 * called with a real, externally-verified fact (e.g. a live price
 * crossing the claim's own invalidationCondition level). This function
 * never infers invalidation from text matching — that would be
 * fabricated precision; a real detector (a future phase's
 * responsibility) supplies the boolean.
 */
async function invalidateClaim(claimId, { reason, now = new Date() } = {}) {
  const claim = await repository.getById(claimId);
  if (!claim || !acceptsNewEvidence(claim.status)) return claim;
  const allEvidence = await repository.listEvidenceForClaim(claimId);
  return recomputeAndPersist(claim, allEvidence, { now, invalidationTriggered: true });
}

module.exports = { CLAIM_TYPE, HORIZON_DURATION_MS, computeExpiresAt, ingestBusEvent, invalidateClaim, recomputeAndPersist };
