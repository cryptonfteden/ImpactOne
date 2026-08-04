// Phase CLAIM-INTELLIGENCE-INTEGRATION-001 — "Connect every Intelligence
// Agent to the Claim Intelligence pipeline." This module is the one new
// seam this phase adds: it turns a real, already-executed agent result
// (from agentOrchestrator.run(), the same shape every existing agent
// adapter already returns) into a real Intelligence Bus event, then
// immediately routes that event into the existing Claim Intelligence
// layer — reusing every already-built mechanism rather than duplicating
// any of it:
//
//   - Confidence: reuses the agent adapter's own `confidence(result)`
//     function (never recomputed here) — see AGENT-*-001 phases, every
//     adapter already exposes this.
//   - Governance: reuses `intelligenceBusService.publishEvent`'s and
//     `claimFormationService.ingestBusEvent`'s own existing governance
//     assertions (`intelligenceBusGovernance`/`claimGovernance`,
//     ultimately `canonicalVerdict.FORBIDDEN_COMMITTEE_KEYS`) — this
//     module adds no governance logic of its own.
//   - Freshness: reused automatically. The Bus computes real
//     `dataFreshness` from `publishedAt` at read time
//     (`intelligenceBusLifecycle.computeFreshness`), and
//     `claimEvidenceLedger.buildEvidenceCandidateFromBusEvent` already
//     derives each evidence entry's own `freshness.ageMs` the same way —
//     this module only ever supplies an honest `publishedAt`.
//   - Contradictions: reused automatically. Once an event reaches
//     `claimFormationService.ingestBusEvent`, it ALREADY checks for a
//     directly opposing open claim on the same subject/horizon
//     (`claimIdentity.isOpposingDirection`) and records real
//     CONTRADICTS evidence against it (possibly marking it CONTESTED) —
//     this module adds no contradiction-detection logic of its own.
//   - Uncertainty: reused automatically. `claimFormationService`'s own
//     `recomputeAndPersist` already calls `claimConfidence.
//     computeUncertainty` from the real evidence agreement ratio
//     whenever a claim's evidence set changes — this module never
//     recomputes it.
//
// In short: this module's only real job is MAPPING a real agent result
// onto the real Bus event contract and calling the two existing real
// entry points (`publishEvent`, `ingestBusEvent`) in sequence — "do not
// redesign the Claim layer," "do not duplicate confidence logic," "do
// not change scoring behavior" are honored by construction, not by
// discipline alone.
const intelligenceBusService = require("../intelligenceBus/intelligenceBusService");
const claimFormationService = require("../claimIntelligence/claimFormationService");
const { isKnownEngine } = require("../intelligenceBus/intelligenceBusRegistry");

const METHODOLOGY_VERSION = "agent-claim-bridge-v1";
const EVENT_TYPE = "AGENT_SIGNAL";

/**
 * Pure mapping — no I/O. Builds the raw event a real, already-fulfilled
 * agent execution would publish, or honestly reports why publishing
 * should be skipped (never fabricates an event for an agent result that
 * isn't real/complete).
 *
 * @param {string} symbol
 * @param {object} agentResult - one entry from agentOrchestrator.run()'s `report.agents` (agentId, agentName, status, result, confidence)
 * @param {Date} now
 * @returns {{ event: object|null, skipped: boolean, reason: string|null }}
 */
function buildRawEventFromAgentResult(symbol, agentResult, now) {
  if (!symbol) {
    return { event: null, skipped: true, reason: "No symbol provided." };
  }
  if (!agentResult || agentResult.status !== "fulfilled" || !agentResult.result) {
    return { event: null, skipped: true, reason: `Agent "${agentResult?.agentId}" did not complete successfully this run (status: ${agentResult?.status}).` };
  }
  if (!isKnownEngine(agentResult.agentId)) {
    // Honest, routine skip — never a thrown error for an agent id this
    // phase's registry extension hasn't (yet) named. See
    // intelligenceBusRegistry.js's own additive KNOWN_ENGINES entries.
    return { event: null, skipped: true, reason: `"${agentResult.agentId}" is not a registered Intelligence Bus engine.` };
  }

  const direction = agentResult.direction || "NEUTRAL";
  const evidence = Array.isArray(agentResult.result.evidence) ? agentResult.result.evidence : [];
  const confidence = Number.isFinite(agentResult.confidence) ? agentResult.confidence : 0;

  const event = {
    engineId: agentResult.agentId,
    eventType: EVENT_TYPE,
    symbols: [String(symbol).toUpperCase()],
    payload: {
      direction,
      summary: agentResult.result.summary || null,
      evidence,
    },
    provenance: {
      sourceEngine: agentResult.agentId,
      sourceProvider: "impactone-agent-platform",
      agentName: agentResult.agentName || agentResult.agentId,
    },
    publishedAt: now,
    methodologyVersion: METHODOLOGY_VERSION,
    confidence,
    evidenceRefs: evidence.map((entry) => entry?.observedFact).filter(Boolean),
  };

  return { event, skipped: false, reason: null };
}

/**
 * Publishes one real agent result into the Intelligence Bus, then
 * immediately routes it into the Claim Intelligence layer via the
 * existing, unmodified `ingestBusEvent`. Never throws — a publish/ingest
 * failure (network, DB, validation) is reported back as an honest
 * `{ skipped: true, reason }`, the same best-effort discipline
 * `intelligenceBusService.projectToCanonicalEvent` already established,
 * so a Claim-pipeline hiccup can never break the real agent run that
 * triggered it.
 *
 * @param {string} symbol
 * @param {object} agentResult
 * @param {{ now?: Date, publishEventFn?: Function, ingestBusEventFn?: Function }} [options]
 * @returns {Promise<{ skipped: boolean, reason: string|null, publishedEvent: object|null, claimResult: object|null }>}
 */
async function publishAgentClaim(symbol, agentResult, { now = new Date(), publishEventFn = intelligenceBusService.publishEvent, ingestBusEventFn = claimFormationService.ingestBusEvent } = {}) {
  const { event, skipped, reason } = buildRawEventFromAgentResult(symbol, agentResult, now);
  if (skipped) {
    return { skipped: true, reason, publishedEvent: null, claimResult: null };
  }

  try {
    const publishedEvent = await publishEventFn(event, { now });
    const claimResult = await ingestBusEventFn(publishedEvent, { now });
    return { skipped: false, reason: null, publishedEvent, claimResult };
  } catch (error) {
    return { skipped: true, reason: `Claim pipeline publish failed for "${agentResult.agentId}": ${error.message}`, publishedEvent: null, claimResult: null };
  }
}

module.exports = { buildRawEventFromAgentResult, publishAgentClaim, METHODOLOGY_VERSION, EVENT_TYPE };
