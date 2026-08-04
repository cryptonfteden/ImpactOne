require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { validateRawEvent } = require("./intelligenceEventContract");

function validEvent(overrides = {}) {
  return {
    engineId: "options",
    eventType: "SWEEP",
    symbols: ["NVDA"],
    payload: { anomalyScore: 80 },
    provenance: { sourceEngine: "options" },
    publishedAt: "2026-07-26T14:30:00.000Z",
    methodologyVersion: "options-agent-v1",
    ...overrides,
  };
}

test("a well-formed raw event from a registered engine is valid", () => {
  const result = validateRawEvent(validEvent());
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("an unregistered engineId is rejected with a specific reason, never silently accepted", () => {
  const result = validateRawEvent(validEvent({ engineId: "madeUpEngine" }));
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("not a registered engine")));
});

test("every required field reports its own specific violation when missing, all at once", () => {
  const result = validateRawEvent({});
  assert.equal(result.valid, false);
  assert.ok(result.errors.length >= 6);
});

test("payload must be a plain object, not an array or primitive", () => {
  assert.equal(validateRawEvent(validEvent({ payload: [1, 2, 3] })).valid, false);
  assert.equal(validateRawEvent(validEvent({ payload: "not an object" })).valid, false);
});

test("provenance.sourceEngine is required whenever provenance is present", () => {
  const result = validateRawEvent(validEvent({ provenance: {} }));
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("provenance.sourceEngine")));
});

test("an out-of-range confidence is rejected", () => {
  assert.equal(validateRawEvent(validEvent({ confidence: 150 })).valid, false);
  assert.equal(validateRawEvent(validEvent({ confidence: -5 })).valid, false);
});

test("a real in-range confidence, or an honestly absent one, is accepted", () => {
  assert.equal(validateRawEvent(validEvent({ confidence: 80 })).valid, true);
  assert.equal(validateRawEvent(validEvent({ confidence: null })).valid, true);
});

test("symbols may be an empty array for a market-wide event (e.g. sentiment)", () => {
  const result = validateRawEvent(validEvent({ symbols: [] }));
  assert.equal(result.valid, true);
});
