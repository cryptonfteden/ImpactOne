const test = require("node:test");
const assert = require("node:assert/strict");
const { collectMetrics, summarizeAgent } = require("./metricsCollector");
const { FAILURE_CODES } = require("./failureTaxonomy");

function rec(overrides) {
  return {
    agentId: "technical",
    durationMs: 100,
    retryCount: 0,
    success: true,
    timeout: false,
    confidence: 80,
    cacheHit: null,
    failureCode: FAILURE_CODES.NONE,
    ...overrides,
  };
}

test("summarizeAgent computes real counts/rates from real records, never fabricated", () => {
  const records = [
    rec({ success: true, confidence: 80 }),
    rec({ success: true, confidence: 60 }),
    rec({ success: false, timeout: true, confidence: 0, failureCode: FAILURE_CODES.TIMEOUT }),
  ];
  const summary = summarizeAgent("technical", records);
  assert.equal(summary.totalExecutions, 3);
  assert.equal(summary.successCount, 2);
  assert.equal(summary.timeoutCount, 1);
  assert.equal(summary.successRate, 2 / 3);
  assert.equal(summary.avgConfidence, 70, "average confidence only over successful executions");
});

test("summarizeAgent's cacheHitRate is null (honestly unknown) when no record reports a cache signal", () => {
  const records = [rec({ cacheHit: null }), rec({ cacheHit: null })];
  const summary = summarizeAgent("technical", records);
  assert.equal(summary.cacheHitRate, null);
  assert.equal(summary.cacheTrackedCount, 0);
});

test("summarizeAgent's cacheHitRate is computed only over records that actually reported cache status", () => {
  const records = [rec({ cacheHit: true }), rec({ cacheHit: false }), rec({ cacheHit: null })];
  const summary = summarizeAgent("technical", records);
  assert.equal(summary.cacheTrackedCount, 2);
  assert.equal(summary.cacheHitRate, 0.5);
});

test("collectMetrics groups records by agentId and also returns an overall rollup", () => {
  const records = [
    rec({ agentId: "technical", confidence: 80 }),
    rec({ agentId: "technical", confidence: 60 }),
    rec({ agentId: "sentiment", confidence: 40 }),
  ];
  const { overall, perAgent } = collectMetrics(records);
  assert.equal(overall.totalExecutions, 3);
  assert.equal(perAgent.length, 2);
  const technical = perAgent.find((a) => a.agentId === "technical");
  assert.equal(technical.totalExecutions, 2);
  const sentiment = perAgent.find((a) => a.agentId === "sentiment");
  assert.equal(sentiment.totalExecutions, 1);
});

test("collectMetrics on an empty list never throws and returns honest zeros", () => {
  const { overall, perAgent } = collectMetrics([]);
  assert.equal(overall.totalExecutions, 0);
  assert.equal(overall.successRate, 0);
  assert.deepEqual(perAgent, []);
});
