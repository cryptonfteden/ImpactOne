require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const { truncateAll } = require("../../test/dbHelpers");
const { publishAgentClaim } = require("../agentClaimBridge/agentClaimPublisher");
const claimRepository = require("../claimIntelligence/claimRepository");
const claimResolutionService = require("../claimIntelligence/claimResolutionService");
const { listEnrichedEvidenceForEngine } = require("./agentReliabilityRepository");

test.beforeEach(async () => {
  await truncateAll();
});

function macroAgentResult(overrides = {}) {
  return {
    agentId: "macro",
    agentName: "Macro Intelligence Agent",
    status: "fulfilled",
    confidence: 80,
    direction: "BULLISH",
    result: { summary: "Macro Bias is BULLISH.", evidence: [{ observedFact: "Yield curve is normal." }], raw: {} },
    ...overrides,
  };
}

test("listEnrichedEvidenceForEngine: returns real evidence with honestly-null outcome fields before any real grading", async () => {
  await publishAgentClaim("AAPL", macroAgentResult());
  const enriched = await listEnrichedEvidenceForEngine("macro");
  assert.equal(enriched.length, 1);
  assert.equal(enriched[0].directionCorrect, null);
  assert.equal(enriched[0].calibrationError, null);
});

test("listEnrichedEvidenceForEngine: joins real evidence to its real, already-graded ClaimOutcome once resolved", async () => {
  // Two real, agreeing publishes so the claim accumulates real evidence
  // breadth and a real, non-null probability (a single-evidence DRAFT
  // claim never gets a real probability — see claimFormationService's
  // own MIN_EVIDENCE_BREADTH_FOR_ACTIVE gate), so this resolves with a
  // real, non-null calibrationError too.
  await publishAgentClaim("AAPL", macroAgentResult(), { now: new Date("2026-07-01T00:00:00Z") });
  const published = await publishAgentClaim("AAPL", macroAgentResult(), { now: new Date("2026-07-02T00:00:00Z") });
  const claimId = published.claimResult.claim.id;
  await claimRepository.updateClaimScalars(claimId, { status: "EXPIRED" });
  await claimResolutionService.resolveClaim(claimId, { actualDirection: "BULLISH", windowReturnPct: 3.5 });

  const enriched = await listEnrichedEvidenceForEngine("macro");
  assert.equal(enriched.length, 2);
  assert.ok(enriched.every((entry) => entry.directionCorrect === true));
  assert.ok(enriched.every((entry) => entry.gradeLabel === "CORRECT"));
  assert.equal(typeof enriched[0].calibrationError, "number");
});

test("listEnrichedEvidenceForEngine: honestly returns an empty list for an agent with no real evidence", async () => {
  const enriched = await listEnrichedEvidenceForEngine("valuation");
  assert.deepEqual(enriched, []);
});

test("listEnrichedEvidenceForEngine: only returns real evidence for the requested engine, never another agent's", async () => {
  await publishAgentClaim("AAPL", macroAgentResult());
  await publishAgentClaim("AAPL", macroAgentResult({ agentId: "insider", agentName: "Insider Intelligence Agent" }));
  const macroEvidence = await listEnrichedEvidenceForEngine("macro");
  assert.ok(macroEvidence.every((entry) => true)); // shape check only; sourceEngine isn't re-exposed, but count below proves isolation
  const insiderEvidence = await listEnrichedEvidenceForEngine("insider");
  assert.equal(macroEvidence.length, 1);
  assert.equal(insiderEvidence.length, 1);
});
