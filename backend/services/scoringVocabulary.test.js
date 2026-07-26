require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  SCORE_DEFINITIONS,
  CANONICAL_SCORE_NAMES,
  getScoreDefinition,
  normalizeSourceCredibility,
  normalizeEvidenceFreshness,
  computeUncertainty,
} = require("./scoringVocabulary");

const EXPECTED_SCORE_NAMES = [
  "confidence",
  "conviction",
  "quality",
  "risk",
  "relevance",
  "sourceCredibility",
  "evidenceFreshness",
  "evidenceAgreement",
  "uncertainty",
  // Phase AI-ENGINE-001.1 — Unusual Options Agent foundation.
  "optionsAnomalyConfidence",
  // Phase AI-ENGINE-002.1 — Market Sentiment Engine foundation.
  "marketSentimentComponentConfidence",
  "marketSentimentOverallConfidence",
];

test("the shared vocabulary documents exactly the twelve required scores", () => {
  assert.deepEqual(CANONICAL_SCORE_NAMES.sort(), [...EXPECTED_SCORE_NAMES].sort());
});

test("every score definition documents range, meaning, formula, and fallback", () => {
  for (const name of CANONICAL_SCORE_NAMES) {
    const definition = SCORE_DEFINITIONS[name];
    assert.ok(definition, `missing definition for ${name}`);
    assert.deepEqual(definition.range, [0, 100], `${name} should be a 0-100 range`);
    assert.equal(typeof definition.meaning, "string");
    assert.ok(definition.meaning.length > 0, `${name} needs a meaning`);
    assert.equal(typeof definition.formula, "string");
    assert.ok(definition.formula.length > 0, `${name} needs a formula/source`);
    assert.equal(typeof definition.fallback, "string");
    assert.ok(definition.fallback.length > 0, `${name} needs documented fallback behavior`);
  }
});

test("getScoreDefinition returns null for an unknown score name", () => {
  assert.equal(getScoreDefinition("notARealScore"), null);
});

test("normalizeSourceCredibility wraps autonomousMarketService.sourceQualityScore's known-outlet/default behavior", () => {
  assert.equal(normalizeSourceCredibility("Reuters"), 95);
  assert.equal(normalizeSourceCredibility("Some Random Blog"), 60);
  assert.equal(normalizeSourceCredibility(null), 60);
});

test("normalizeEvidenceFreshness wraps autonomousMarketService.recencyScore's decay behavior", () => {
  assert.equal(normalizeEvidenceFreshness(new Date().toISOString()), 100);
  assert.equal(normalizeEvidenceFreshness(null), 40);
});

test("computeUncertainty falls back to 50 when neither input is available", () => {
  assert.equal(computeUncertainty({}), 50);
});

test("computeUncertainty uses evidenceAgreement alone when no consensusLevel exists", () => {
  assert.equal(computeUncertainty({ evidenceAgreement: 80 }), 20);
});

test("computeUncertainty uses consensusLevel alone when no evidenceAgreement exists", () => {
  assert.equal(computeUncertainty({ consensusLevel: 90 }), 10);
});

test("computeUncertainty averages evidenceAgreement and consensusLevel when both exist", () => {
  assert.equal(computeUncertainty({ evidenceAgreement: 80, consensusLevel: 60 }), 30);
});

test("computeUncertainty stays within the documented 0-100 range", () => {
  assert.ok(computeUncertainty({ evidenceAgreement: 0, consensusLevel: 0 }) <= 100);
  assert.ok(computeUncertainty({ evidenceAgreement: 100, consensusLevel: 100 }) >= 0);
});
