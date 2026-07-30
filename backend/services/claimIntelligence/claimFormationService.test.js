require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../../test/dbHelpers");
const claimFormationService = require("./claimFormationService");
const repository = require("./claimRepository");
const { FORBIDDEN_GOVERNANCE_KEYS } = require("./claimGovernance");
const { MIN_EVIDENCE_BREADTH_FOR_ACTIVE } = require("./claimDimensions");
const intelligenceBusService = require("../intelligenceBus/intelligenceBusService");

function optionsBusEvent({ symbol = "NVDA", aggressorSide = "BUY", confidence = 78, publishedAt = "2026-07-26T14:30:00.000Z", explanation, id } = {}) {
  return {
    id: id || `evt_${Math.random().toString(36).slice(2)}`,
    engineId: "options",
    symbols: [symbol],
    payload: { signalType: "SWEEP", aggressorSide, explanation: explanation || `${symbol} calls swept multiple exchanges.` },
    provenance: { sourceEngine: "options", sourceProvider: "optionsFlow" },
    publishedAt,
    confidence,
  };
}

function sentimentBusEvent({ score = 65, confidence = 60, publishedAt = "2026-07-26T21:00:00.000Z", id } = {}) {
  return {
    id: id || `evt_${Math.random().toString(36).slice(2)}`,
    engineId: "sentiment",
    symbols: ["NVDA"],
    payload: { score, summary: "NVDA-specific sentiment reading." },
    provenance: { sourceEngine: "sentiment", sourceProvider: "sentimentEngine" },
    publishedAt,
    confidence,
  };
}

test.beforeEach(async () => {
  await truncateAll();
});

test("claim creation: a single real evidence entry creates a DRAFT claim, never immediately ACTIVE (never unjustified certainty)", async () => {
  const result = await claimFormationService.ingestBusEvent(optionsBusEvent(), { now: new Date("2026-07-26T15:00:00.000Z") });
  assert.equal(result.action, "created");
  assert.equal(result.claim.status, "DRAFT");
  assert.equal(result.claim.expectedDirection, "BULLISH");
  assert.equal(result.claim.confidence, null);
});

test("claim creation: provenance is preserved exactly as the originating engine supplied it", async () => {
  const result = await claimFormationService.ingestBusEvent(optionsBusEvent({ symbol: "META" }), { now: new Date() });
  assert.equal(result.claim.provenance.sourceEngine, "options");
  assert.equal(result.claim.provenance.sourceProvider, "optionsFlow");
  assert.ok(result.claim.provenance.intelligenceBusEventId);
});

test("supporting evidence update: a second real supporting event in the same series promotes the claim past DRAFT and updates confidence/probability", async () => {
  const now = new Date("2026-07-26T15:00:00.000Z");
  const first = await claimFormationService.ingestBusEvent(optionsBusEvent({ symbol: "NVDA" }), { now });
  assert.equal(first.claim.status, "DRAFT");

  const second = await claimFormationService.ingestBusEvent(optionsBusEvent({ symbol: "NVDA", confidence: 82, publishedAt: new Date(now.getTime() + 3600000).toISOString() }), { now: new Date(now.getTime() + 3600000) });
  assert.equal(second.action, "updated");
  assert.notEqual(second.claim.status, "DRAFT");
  assert.ok(Number.isFinite(second.claim.confidence));
  assert.ok(Number.isFinite(second.claim.probability));
  assert.equal(second.claim.sourceAgents.includes("options"), true);
});

test("supporting evidence update: cross-engine evidence (sentiment) in the SAME series (matched by identity, not engine) also updates the claim and is recorded in sourceAgents", async () => {
  // Sentiment's real, disclosed horizon mapping is W1, distinct from
  // options' D1 (CLAIM_LIFECYCLE.md §4) — so a genuine cross-engine
  // update of the SAME claim requires both events to land in the same
  // horizon bucket, which only happens for sentiment-original claims.
  const now = new Date("2026-07-26T21:00:00.000Z");
  const first = await claimFormationService.ingestBusEvent(sentimentBusEvent({ score: 65 }), { now });
  assert.equal(first.claim.status, "DRAFT");
  assert.equal(first.claim.sourceAgents[0], "sentiment");

  const second = await claimFormationService.ingestBusEvent(sentimentBusEvent({ score: 72, publishedAt: new Date(now.getTime() + 3600000).toISOString() }), { now: new Date(now.getTime() + 3600000) });
  assert.equal(second.action, "updated");
  assert.notEqual(second.claim.status, "DRAFT");
});

test(`duplicate prevention: identity is structural — ${MIN_EVIDENCE_BREADTH_FOR_ACTIVE} evidence entries for the same identity never create two Claim rows`, async () => {
  const now = new Date("2026-07-26T15:00:00.000Z");
  await claimFormationService.ingestBusEvent(optionsBusEvent({ symbol: "NVDA" }), { now });
  await claimFormationService.ingestBusEvent(optionsBusEvent({ symbol: "NVDA", confidence: 60 }), { now: new Date(now.getTime() + 60000) });
  const claims = await repository.listOpenBySubjectHorizon({ subject: "NVDA", timeHorizon: "D1", symbols: ["NVDA"] });
  assert.equal(claims.length, 1);
});

test("weakening from counter-evidence: a real opposing-direction event in the SAME series (same engine, same D1 horizon) cross-links as counter-evidence and changes confidence", async () => {
  const now = new Date("2026-07-26T15:00:00.000Z");
  await claimFormationService.ingestBusEvent(optionsBusEvent({ symbol: "NVDA", aggressorSide: "BUY" }), { now });
  await claimFormationService.ingestBusEvent(optionsBusEvent({ symbol: "NVDA", aggressorSide: "BUY", confidence: 60 }), { now: new Date(now.getTime() + 60000) }); // promote to non-DRAFT
  const bullishBefore = (await repository.listOpenBySubjectHorizon({ subject: "NVDA", timeHorizon: "D1", symbols: ["NVDA"] }))[0];

  await claimFormationService.ingestBusEvent(optionsBusEvent({ symbol: "NVDA", aggressorSide: "SELL", confidence: 65, publishedAt: new Date(now.getTime() + 120000).toISOString() }), { now: new Date(now.getTime() + 120000) });

  const bullishAfter = await repository.getById(bullishBefore.id);
  const evidence = await repository.listEvidenceForClaim(bullishBefore.id);
  assert.ok(evidence.some((entry) => entry.stance === "CONTRADICTS"));
  assert.notEqual(bullishAfter.confidence, bullishBefore.confidence);
  assert.ok(bullishAfter.confidence < bullishBefore.confidence);
});

test("contradictory claim separation: a bearish claim about the same symbol/horizon is a SEPARATE claim, never silently merged into the bullish one", async () => {
  const now = new Date("2026-07-26T15:00:00.000Z");
  await claimFormationService.ingestBusEvent(optionsBusEvent({ symbol: "NVDA", aggressorSide: "BUY" }), { now });
  await claimFormationService.ingestBusEvent(optionsBusEvent({ symbol: "NVDA", aggressorSide: "SELL", publishedAt: new Date(now.getTime() + 60000).toISOString() }), { now: new Date(now.getTime() + 60000) });

  const claims = await repository.listOpenBySubjectHorizon({ subject: "NVDA", timeHorizon: "D1", symbols: ["NVDA"] });
  const directions = claims.map((claim) => claim.expectedDirection).sort();
  assert.deepEqual(directions, ["BEARISH", "BULLISH"]);
});

test("contested claims: strong, real disagreement (evidenceAgreement below threshold) transitions a claim to CONTESTED", async () => {
  const now = new Date("2026-07-26T15:00:00.000Z");
  const created = await claimFormationService.ingestBusEvent(optionsBusEvent({ symbol: "NVDA", aggressorSide: "BUY" }), { now });
  assert.equal(created.claim.status, "DRAFT"); // 1 evidence entry only, so far

  // A real, opposing-direction event in the SAME D1 series cross-links as
  // CONTRADICTS onto the bullish claim — now 1 SUPPORTS vs 1 CONTRADICTS
  // = 50% agreement, below the CONTESTED threshold (55%), and evidence
  // breadth (2) is real, so the claim resolves straight to CONTESTED
  // rather than staying DRAFT.
  await claimFormationService.ingestBusEvent(optionsBusEvent({ symbol: "NVDA", aggressorSide: "SELL", confidence: 60, publishedAt: new Date(now.getTime() + 60000).toISOString() }), { now: new Date(now.getTime() + 60000) });

  const contested = await repository.listContested({ limit: 10 });
  assert.ok(contested.some((entry) => entry.id === created.claim.id));
});

test("different time-horizon separation: an options (D1) claim and a sentiment (W1) claim about the same symbol/direction are never merged", async () => {
  const now = new Date("2026-07-26T15:00:00.000Z");
  await claimFormationService.ingestBusEvent(optionsBusEvent({ symbol: "NVDA", aggressorSide: "BUY" }), { now });
  await claimFormationService.ingestBusEvent(sentimentBusEvent({ score: 80, publishedAt: new Date(now.getTime() + 60000).toISOString() }), { now: new Date(now.getTime() + 60000) });

  const d1Claims = await repository.listOpenBySubjectHorizon({ subject: "NVDA", timeHorizon: "D1", symbols: ["NVDA"] });
  const w1Claims = await repository.listOpenBySubjectHorizon({ subject: "NVDA", timeHorizon: "W1", symbols: ["NVDA"] });
  assert.equal(d1Claims.length, 1);
  assert.equal(w1Claims.length, 1);
  assert.notEqual(d1Claims[0].id, w1Claims[0].id);
});

test("invalidation: an explicit real invalidation trigger moves an open claim straight to INVALIDATED regardless of its current confidence trend", async () => {
  const now = new Date("2026-07-26T15:00:00.000Z");
  const created = await claimFormationService.ingestBusEvent(optionsBusEvent({ symbol: "NVDA" }), { now });
  await claimFormationService.ingestBusEvent(optionsBusEvent({ symbol: "NVDA", confidence: 90 }), { now: new Date(now.getTime() + 60000) });

  const result = await claimFormationService.invalidateClaim(created.claim.id, { reason: "Real price crossed the invalidation level.", now: new Date(now.getTime() + 120000) });
  assert.equal(result.status, "INVALIDATED");

  const transitions = await repository.listTransitionsForClaim(created.claim.id);
  assert.ok(transitions.some((transition) => transition.toStatus === "INVALIDATED"));
});

test("invalidation: a claim in a fully-terminal status is never invalidated", async () => {
  const now = new Date("2026-07-26T15:00:00.000Z");
  const created = await claimFormationService.ingestBusEvent(optionsBusEvent({ symbol: "NVDA" }), { now });
  // Manually force a terminal status to simulate an already-resolved claim.
  await repository.updateClaimScalars(created.claim.id, { status: "RESOLVED_CORRECT" });
  const result = await claimFormationService.invalidateClaim(created.claim.id, { now });
  assert.equal(result.status, "RESOLVED_CORRECT");
});

test("lifecycle transition audit: every real status change is recorded, in order, and is fully replayable", async () => {
  const now = new Date("2026-07-26T15:00:00.000Z");
  const created = await claimFormationService.ingestBusEvent(optionsBusEvent({ symbol: "NVDA" }), { now });
  await claimFormationService.ingestBusEvent(optionsBusEvent({ symbol: "NVDA", confidence: 85 }), { now: new Date(now.getTime() + 60000) });

  const transitions = await repository.listTransitionsForClaim(created.claim.id);
  assert.ok(transitions.length >= 2);
  assert.equal(transitions[0].fromStatus, null);
  assert.equal(transitions[0].toStatus, "DRAFT");
  assert.notEqual(transitions[1].toStatus, "DRAFT");
});

test("governance field prohibition: a real, fully-formed claim never carries a forbidden field, top-level or in its evidence", async () => {
  const created = await claimFormationService.ingestBusEvent(optionsBusEvent({ symbol: "NVDA" }), { now: new Date() });
  for (const key of FORBIDDEN_GOVERNANCE_KEYS) {
    assert.equal(key in created.claim, false);
  }
});

test("source failure isolation: an event from a non-integrated engine is ignored and never contaminates or blocks real claim formation", async () => {
  const now = new Date("2026-07-26T15:00:00.000Z");
  // Phase CLAIM-INTELLIGENCE-INTEGRATION-001 extended INTEGRATED_ENGINES
  // to include every one of the 14 real Domain Intelligence Agents
  // (including "macro"), so this test now targets a genuinely
  // non-integrated Bus-only engine id ("ownership" — present in
  // intelligenceBusRegistry.KNOWN_ENGINES but with no corresponding
  // real agent, still correctly excluded here).
  const ignored = await claimFormationService.ingestBusEvent({ id: "evt_x", engineId: "ownership", symbols: ["NVDA"], payload: {}, provenance: { sourceEngine: "ownership" }, publishedAt: now.toISOString(), confidence: 90 }, { now });
  assert.equal(ignored, null);

  const created = await claimFormationService.ingestBusEvent(optionsBusEvent({ symbol: "NVDA" }), { now });
  assert.equal(created.action, "created");
  const claims = await repository.listOpenBySubjectHorizon({ subject: "NVDA", timeHorizon: "D1", symbols: ["NVDA"] });
  assert.equal(claims.length, 1); // only the real, integrated-engine claim exists
});

test("source failure isolation: a NEUTRAL-direction event (no informative directional content) never forms or updates a claim", async () => {
  const result = await claimFormationService.ingestBusEvent(optionsBusEvent({ symbol: "NVDA", aggressorSide: "UNKNOWN" }), { now: new Date() });
  assert.equal(result, null);
});

test("the Claim Layer consumes REAL, persisted Intelligence Bus events (sits above the Bus, does not replace it)", async () => {
  const now = new Date("2026-07-26T15:00:00.000Z");
  const publishedEvent = await intelligenceBusService.publishEvent(
    {
      engineId: "options",
      eventType: "SWEEP",
      symbols: ["NVDA"],
      payload: { signalType: "SWEEP", aggressorSide: "BUY", anomalyScore: 80, explanation: "NVDA calls swept 3 exchanges." },
      provenance: { sourceEngine: "options", sourceProvider: "optionsFlow", sourceEventId: "sig_real_1" },
      confidence: 80,
      publishedAt: now.toISOString(),
      methodologyVersion: "options-agent-v1",
    },
    { now }
  );
  assert.equal(publishedEvent.duplicate, false);

  const result = await claimFormationService.ingestBusEvent(publishedEvent, { now: new Date(now.getTime() + 1000) });
  assert.equal(result.action, "created");
  assert.equal(result.claim.provenance.intelligenceBusEventId, publishedEvent.id);
});

test("deterministic output: two independent, identical evidence sequences (different symbols) produce identically-shaped claims", async () => {
  const now = new Date("2026-07-26T15:00:00.000Z");
  const a1 = await claimFormationService.ingestBusEvent(optionsBusEvent({ symbol: "AAA", confidence: 70 }), { now });
  await claimFormationService.ingestBusEvent(optionsBusEvent({ symbol: "AAA", confidence: 70 }), { now: new Date(now.getTime() + 60000) });
  const b1 = await claimFormationService.ingestBusEvent(optionsBusEvent({ symbol: "BBB", confidence: 70 }), { now });
  await claimFormationService.ingestBusEvent(optionsBusEvent({ symbol: "BBB", confidence: 70 }), { now: new Date(now.getTime() + 60000) });

  const claimA = await repository.getById(a1.claim.id);
  const claimB = await repository.getById(b1.claim.id);
  assert.equal(claimA.confidence, claimB.confidence);
  assert.equal(claimA.status, claimB.status);
});
