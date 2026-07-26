require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { inferEvidenceDirection, buildEvidenceCandidateFromBusEvent, computeStance } = require("./claimEvidenceLedger");

test("direction inference: options aggressorSide BUY/SELL map to real BULLISH/BEARISH, never guessed otherwise", () => {
  assert.equal(inferEvidenceDirection("options", { aggressorSide: "BUY" }), "BULLISH");
  assert.equal(inferEvidenceDirection("options", { aggressorSide: "SELL" }), "BEARISH");
  assert.equal(inferEvidenceDirection("options", { aggressorSide: "UNKNOWN" }), "NEUTRAL");
  assert.equal(inferEvidenceDirection("options", {}), "NEUTRAL");
});

test("direction inference: sentiment score above/below the dead zone maps to real BULLISH/BEARISH", () => {
  assert.equal(inferEvidenceDirection("sentiment", { score: 70 }), "BULLISH");
  assert.equal(inferEvidenceDirection("sentiment", { score: 30 }), "BEARISH");
  assert.equal(inferEvidenceDirection("sentiment", { score: 50 }), "NEUTRAL");
  assert.equal(inferEvidenceDirection("sentiment", {}), "NEUTRAL");
});

test("buildEvidenceCandidateFromBusEvent: returns null for a non-integrated engine — source isolation, never processed", () => {
  const candidate = buildEvidenceCandidateFromBusEvent({ engineId: "macro", symbols: ["NVDA"], payload: {}, provenance: { sourceEngine: "macro" }, publishedAt: new Date().toISOString(), confidence: 80 });
  assert.equal(candidate, null);
});

test("buildEvidenceCandidateFromBusEvent: a real options sweep event produces a real, traceable candidate", () => {
  const now = new Date("2026-07-26T15:00:00.000Z");
  const busEvent = {
    id: "evt_1",
    engineId: "options",
    symbols: ["NVDA"],
    payload: { signalType: "SWEEP", aggressorSide: "BUY", explanation: "NVDA calls swept 3 exchanges." },
    provenance: { sourceEngine: "options", sourceProvider: "optionsFlow" },
    publishedAt: "2026-07-26T14:30:00.000Z",
    confidence: 78,
  };
  const candidate = buildEvidenceCandidateFromBusEvent(busEvent, { now });
  assert.equal(candidate.evidenceDirection, "BULLISH");
  assert.equal(candidate.intelligenceBusEventId, "evt_1");
  assert.equal(candidate.confidence, 78);
  assert.equal(candidate.freshness.ageMs, 30 * 60 * 1000);
  assert.equal(candidate.observedFact, "NVDA calls swept 3 exchanges.");
});

test("computeStance: the same evidence direction SUPPORTS a matching claim and CONTRADICTS an opposing one", () => {
  assert.equal(computeStance("BULLISH", "BULLISH"), "SUPPORTS");
  assert.equal(computeStance("BULLISH", "BEARISH"), "CONTRADICTS");
});

test("computeStance: NEUTRAL-direction evidence never produces a fabricated stance", () => {
  assert.equal(computeStance("NEUTRAL", "BULLISH"), null);
});
