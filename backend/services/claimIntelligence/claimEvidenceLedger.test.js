require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { inferEvidenceDirection, inferTimeHorizon, buildEvidenceCandidateFromBusEvent, computeStance } = require("./claimEvidenceLedger");

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
  // Phase CLAIM-INTELLIGENCE-INTEGRATION-001 extended INTEGRATED_ENGINES
  // to include every one of the 14 real Domain Intelligence Agents
  // (including "macro"), so this test now targets a genuinely
  // non-integrated Bus-only engine id ("ownership" — present in
  // intelligenceBusRegistry.KNOWN_ENGINES but with no corresponding
  // real agent, still correctly excluded here).
  const candidate = buildEvidenceCandidateFromBusEvent({ engineId: "ownership", symbols: ["NVDA"], payload: {}, provenance: { sourceEngine: "ownership" }, publishedAt: new Date().toISOString(), confidence: 80 });
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

// Phase CLAIM-INTELLIGENCE-INTEGRATION-001 — the generic fallback used
// by every newly-integrated Domain Intelligence Agent.
test("direction inference: any newly-integrated agent's real, already-normalized payload.direction is read directly, never re-derived", () => {
  assert.equal(inferEvidenceDirection("macro", { direction: "BULLISH" }), "BULLISH");
  assert.equal(inferEvidenceDirection("insider", { direction: "BEARISH" }), "BEARISH");
  assert.equal(inferEvidenceDirection("analyst-consensus", { direction: "NEUTRAL" }), "NEUTRAL");
  assert.equal(inferEvidenceDirection("technical", {}), "NEUTRAL");
});

test("buildEvidenceCandidateFromBusEvent: a real macro Bus event (newly integrated) produces a real, traceable candidate", () => {
  const now = new Date("2026-07-30T12:00:00.000Z");
  const busEvent = {
    id: "evt_macro_1",
    engineId: "macro",
    symbols: ["AAPL"],
    payload: { direction: "BULLISH", summary: "Macro Bias is BULLISH." },
    provenance: { sourceEngine: "macro", sourceProvider: "impactone-agent-platform" },
    publishedAt: "2026-07-30T10:00:00.000Z",
    confidence: 80,
  };
  const candidate = buildEvidenceCandidateFromBusEvent(busEvent, { now });
  assert.equal(candidate.evidenceDirection, "BULLISH");
  assert.equal(candidate.sourceEngine, "macro");
  assert.equal(candidate.observedFact, "Macro Bias is BULLISH.");
  assert.equal(candidate.timeHorizon, "M1");
});

test("inferTimeHorizon: every newly-integrated agent gets a real, disclosed default bucket, never an unhandled undefined", () => {
  const AGENT_IDS = [
    "technical", "symbol-sentiment", "news", "short-interest", "earnings",
    "valuation", "fibonacci", "insider", "etf-flow", "institutional", "macro", "analyst-consensus",
  ];
  for (const engineId of AGENT_IDS) {
    const horizon = inferTimeHorizon(engineId);
    assert.ok(["D1", "W1", "M1", "M3", "M6", "Y1"].includes(horizon), `engine "${engineId}" must map to a real TimeWindow bucket, got "${horizon}"`);
  }
});
