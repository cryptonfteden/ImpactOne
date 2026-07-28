const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeSurprise, analyzeConsistency } = require("./surpriseAnalyzer");
const { emptyMetrics } = require("./earningsDataProvider");

function metricsWithHistory(surprisePercents) {
  const base = emptyMetrics("NVDA", null);
  base.dataAvailable = true;
  base.epsHistory = surprisePercents.map((surprisePercent, i) => ({ period: `2026-Q${i + 1}`, actual: 1, estimate: 1, surprise: 0, surprisePercent }));
  return base;
}

test("no data available => null surprise score, UNKNOWN consistency, no fabricated read", () => {
  const result = analyzeSurprise(emptyMetrics("NVDA", "not connected"));
  assert.equal(result.surpriseScore, null);
  assert.equal(result.consistency.rating, "UNKNOWN");
});

test("analyzeConsistency reports UNKNOWN with an empty history, never a guessed rating", () => {
  const result = analyzeConsistency([]);
  assert.equal(result.rating, "UNKNOWN");
  assert.equal(result.sampleSize, 0);
});

test("analyzeConsistency rates HIGH with a strong, tight beat streak", () => {
  const result = analyzeConsistency([5, 6, 4, 7]);
  assert.equal(result.rating, "HIGH");
  assert.equal(result.beatRate, 1);
});

test("analyzeConsistency rates LOW with a poor beat rate", () => {
  const result = analyzeConsistency([-10, -5, 2, -8]);
  assert.equal(result.rating, "LOW");
  assert.ok(result.beatRate < 0.5);
});

test("analyzeConsistency rates MODERATE with a real, middling beat rate", () => {
  const result = analyzeConsistency([5, -5, 6, -6]);
  assert.equal(result.rating, "MODERATE");
  assert.equal(result.beatRate, 0.5);
});

test("real, positive average surprise with a high beat rate produces a high surprise score", () => {
  const result = analyzeSurprise(metricsWithHistory([8, 10, 6, 9]));
  assert.ok(result.surpriseScore > 70);
});

test("real, negative average surprise with a low beat rate produces a low surprise score", () => {
  const result = analyzeSurprise(metricsWithHistory([-8, -10, -6, -9]));
  assert.ok(result.surpriseScore < 30);
});

test("epsHistory entries with a null surprisePercent are excluded from the real computation, never treated as zero", () => {
  const metrics = emptyMetrics("NVDA", null);
  metrics.dataAvailable = true;
  metrics.epsHistory = [
    { period: "Q1", actual: null, estimate: null, surprise: null, surprisePercent: null },
    { period: "Q2", actual: 1, estimate: 1, surprise: 0.1, surprisePercent: 10 },
  ];
  const result = analyzeSurprise(metrics);
  assert.equal(result.consistency.sampleSize, 1);
});

test("dataAvailable but genuinely empty epsHistory => null surprise score, not zero", () => {
  const metrics = emptyMetrics("NVDA", null);
  metrics.dataAvailable = true;
  const result = analyzeSurprise(metrics);
  assert.equal(result.surpriseScore, null);
});
