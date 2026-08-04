require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeConfidence, aggregateEvidence } = require("./intelligenceBusConfidence");

test("confidence propagation: a real engine confidence passes through normalized, unchanged in value", () => {
  assert.equal(normalizeConfidence(78), 78);
});

test("confidence propagation: null/undefined confidence stays honestly null, never a fabricated default", () => {
  assert.equal(normalizeConfidence(null), null);
  assert.equal(normalizeConfidence(undefined), null);
});

test("confidence propagation: an out-of-range or non-numeric value is clamped/rejected, never silently passed through raw", () => {
  assert.equal(normalizeConfidence(150), 100);
  assert.equal(normalizeConfidence(-10), 0);
  assert.equal(normalizeConfidence("not-a-number"), null);
});

test("evidence aggregation: honestly null with zero contributing events", () => {
  const result = aggregateEvidence([]);
  assert.equal(result.aggregateConfidence, null);
  assert.equal(result.evidenceAgreement, null);
  assert.equal(result.contributingEventCount, 0);
});

test("evidence aggregation: real average confidence across multiple real events", () => {
  const result = aggregateEvidence([{ confidence: 80 }, { confidence: 60 }]);
  assert.equal(result.aggregateConfidence, 70);
  assert.equal(result.contributingEventCount, 2);
});

test("evidence aggregation: evidenceAgreement reflects the real directional majority, never fabricated without real directions", () => {
  const result = aggregateEvidence([
    { confidence: 80, direction: "bullish" },
    { confidence: 70, direction: "bullish" },
    { confidence: 60, direction: "bearish" },
  ]);
  assert.equal(Math.round(result.evidenceAgreement), 67);
});

test("evidence aggregation: evidenceAgreement stays honestly null when no event supplied a real direction", () => {
  const result = aggregateEvidence([{ confidence: 80 }, { confidence: 60 }]);
  assert.equal(result.evidenceAgreement, null);
});
