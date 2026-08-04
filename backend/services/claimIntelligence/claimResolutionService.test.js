require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../../test/dbHelpers");
const claimFormationService = require("./claimFormationService");
const claimResolutionService = require("./claimResolutionService");
const repository = require("./claimRepository");

function optionsBusEvent({ symbol = "NVDA", aggressorSide = "BUY", confidence = 78, publishedAt = "2026-07-26T14:30:00.000Z" } = {}) {
  return {
    id: `evt_${Math.random().toString(36).slice(2)}`,
    engineId: "options",
    symbols: [symbol],
    payload: { signalType: "SWEEP", aggressorSide, explanation: `${symbol} calls swept multiple exchanges.` },
    provenance: { sourceEngine: "options", sourceProvider: "optionsFlow" },
    publishedAt,
    confidence,
  };
}

async function makeExpiredClaim({ now, direction = "BUY", confidenceValues = [78, 82] } = {}) {
  const first = await claimFormationService.ingestBusEvent(optionsBusEvent({ aggressorSide: direction, confidence: confidenceValues[0], publishedAt: now.toISOString() }), { now });
  await claimFormationService.ingestBusEvent(optionsBusEvent({ aggressorSide: direction, confidence: confidenceValues[1], publishedAt: new Date(now.getTime() + 60000).toISOString() }), { now: new Date(now.getTime() + 60000) });
  await repository.updateClaimScalars(first.claim.id, { status: "EXPIRED" });
  return repository.getById(first.claim.id);
}

test.beforeEach(async () => {
  await truncateAll();
});

test("computeDirectionCorrect / computeGradeLabel are pure and deterministic", () => {
  assert.equal(claimResolutionService.computeDirectionCorrect("BULLISH", "BULLISH"), true);
  assert.equal(claimResolutionService.computeDirectionCorrect("BULLISH", "BEARISH"), false);
  assert.equal(claimResolutionService.computeDirectionCorrect("BULLISH", null), null);
  assert.equal(claimResolutionService.computeGradeLabel({ directionCorrect: null }), "UNGRADEABLE");
  assert.equal(claimResolutionService.computeGradeLabel({ directionCorrect: false }), "INCORRECT");
  assert.equal(claimResolutionService.computeGradeLabel({ directionCorrect: true, windowReturnPct: 5 }), "CORRECT");
  assert.equal(claimResolutionService.computeGradeLabel({ directionCorrect: true, windowReturnPct: 0.5 }), "PARTIALLY_CORRECT");
});

test("computeCalibrationError is a real, deterministic Brier-style error, honestly null without a real probability", () => {
  assert.equal(claimResolutionService.computeCalibrationError(80, true), 0.2);
  assert.equal(claimResolutionService.computeCalibrationError(80, false), 0.8);
  assert.equal(claimResolutionService.computeCalibrationError(null, true), null);
  assert.equal(claimResolutionService.computeCalibrationError(80, null), null);
});

test("correct resolution: an EXPIRED bullish claim whose real outcome moved up meaningfully resolves RESOLVED_CORRECT", async () => {
  const now = new Date("2026-07-26T15:00:00.000Z");
  const claim = await makeExpiredClaim({ now });
  const result = await claimResolutionService.resolveClaim(claim.id, { actualDirection: "BULLISH", windowReturnPct: 6.2, benchmarkReturnPct: 1.1 }, { now: new Date(now.getTime() + 200000000) });
  assert.equal(result.claim.status, "RESOLVED_CORRECT");
  assert.equal(result.outcome.gradeLabel, "CORRECT");
  assert.equal(result.outcome.directionCorrect, true);
});

test("partial resolution: an EXPIRED bullish claim whose real outcome moved the right direction but by a trivial magnitude resolves RESOLVED_PARTIAL", async () => {
  const now = new Date("2026-07-26T15:00:00.000Z");
  const claim = await makeExpiredClaim({ now });
  const result = await claimResolutionService.resolveClaim(claim.id, { actualDirection: "BULLISH", windowReturnPct: 0.4 }, { now: new Date(now.getTime() + 200000000) });
  assert.equal(result.claim.status, "RESOLVED_PARTIAL");
  assert.equal(result.outcome.gradeLabel, "PARTIALLY_CORRECT");
});

test("incorrect resolution: an EXPIRED bullish claim whose real outcome moved the opposite direction resolves RESOLVED_INCORRECT", async () => {
  const now = new Date("2026-07-26T15:00:00.000Z");
  const claim = await makeExpiredClaim({ now });
  const result = await claimResolutionService.resolveClaim(claim.id, { actualDirection: "BEARISH", windowReturnPct: -4.5 }, { now: new Date(now.getTime() + 200000000) });
  assert.equal(result.claim.status, "RESOLVED_INCORRECT");
  assert.equal(result.outcome.gradeLabel, "INCORRECT");
  assert.equal(result.outcome.directionCorrect, false);
});

test("resolution: a claim with no real determinable outcome resolves honestly to INSUFFICIENT_DATA, never guessed", async () => {
  const now = new Date("2026-07-26T15:00:00.000Z");
  const claim = await makeExpiredClaim({ now });
  const result = await claimResolutionService.resolveClaim(claim.id, null, { now: new Date(now.getTime() + 200000000) });
  assert.equal(result.claim.status, "INSUFFICIENT_DATA");
  assert.equal(result.outcome.gradeLabel, "UNGRADEABLE");
});

test("resolveClaim rejects a claim that is not yet in a pre-grade-terminal status — grading only applies to EXPIRED/INVALIDATED claims", async () => {
  const now = new Date("2026-07-26T15:00:00.000Z");
  const first = await claimFormationService.ingestBusEvent(optionsBusEvent(), { now });
  await assert.rejects(() => claimResolutionService.resolveClaim(first.claim.id, { actualDirection: "BULLISH", windowReturnPct: 5 }), /not in a pre-grade-terminal status/);
});

test("learning feedback generation: a CORRECT resolution produces a real, bounded positive feedback signal for the contributing engine", async () => {
  const now = new Date("2026-07-26T15:00:00.000Z");
  const claim = await makeExpiredClaim({ now });
  const result = await claimResolutionService.resolveClaim(claim.id, { actualDirection: "BULLISH", windowReturnPct: 6 }, { now: new Date(now.getTime() + 200000000) });
  const feedback = result.outcome.learningFeedback;
  assert.ok(feedback.agentReliabilityDeltas.some((entry) => entry.engineId === "options" && entry.delta > 0));
  for (const entry of [...feedback.sourceCredibilityDeltas, ...feedback.agentReliabilityDeltas]) {
    assert.ok(Math.abs(entry.delta) <= claimResolutionService.PER_SOURCE_FEEDBACK_BOUND);
  }
  assert.match(feedback.note, /not automatically applied/);
});

test("learning feedback generation: an INCORRECT resolution produces a real, bounded negative feedback signal", async () => {
  const now = new Date("2026-07-26T15:00:00.000Z");
  const claim = await makeExpiredClaim({ now });
  const result = await claimResolutionService.resolveClaim(claim.id, { actualDirection: "BEARISH", windowReturnPct: -5 }, { now: new Date(now.getTime() + 200000000) });
  const feedback = result.outcome.learningFeedback;
  assert.ok(feedback.agentReliabilityDeltas.some((entry) => entry.engineId === "options" && entry.delta < 0));
});

test("learning feedback generation: an UNGRADEABLE resolution produces no feedback deltas at all — never a fabricated signal from no real outcome", async () => {
  const now = new Date("2026-07-26T15:00:00.000Z");
  const claim = await makeExpiredClaim({ now });
  const result = await claimResolutionService.resolveClaim(claim.id, null, { now: new Date(now.getTime() + 200000000) });
  const feedback = result.outcome.learningFeedback;
  assert.equal(feedback.agentReliabilityDeltas.length, 0);
  assert.equal(feedback.sourceCredibilityDeltas.length, 0);
});

test("lifecycle transition audit: resolution records a real transition from the pre-grade-terminal status to the final resolved status", async () => {
  const now = new Date("2026-07-26T15:00:00.000Z");
  const claim = await makeExpiredClaim({ now });
  await claimResolutionService.resolveClaim(claim.id, { actualDirection: "BULLISH", windowReturnPct: 6 }, { now: new Date(now.getTime() + 200000000) });
  const transitions = await repository.listTransitionsForClaim(claim.id);
  const last = transitions[transitions.length - 1];
  assert.equal(last.fromStatus, "EXPIRED");
  assert.equal(last.toStatus, "RESOLVED_CORRECT");
});
