// Phase AGENT-OBSERVABILITY-001 — pure aggregation over execution
// records. No agent business logic: every function here reads only the
// generic fields every execution record has (duration, success, health,
// confidence, cache/dataSources), never an agent's summary/raw content.
const { FAILURE_CODES } = require("./failureTaxonomy");

function average(numbers) {
  if (!numbers.length) return 0;
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

/**
 * Aggregate metrics for one agent's records (or a mixed set, if the
 * caller wants a platform-wide rollup — pass `agentId: null` to signal that).
 */
function summarizeAgent(agentId, records) {
  const total = records.length;
  const successes = records.filter((r) => r.success);
  const timeouts = records.filter((r) => r.timeout);
  const failures = records.filter((r) => r.failureCode === FAILURE_CODES.AGENT_ERROR);
  const unavailable = records.filter((r) => r.failureCode === FAILURE_CODES.AGENT_UNAVAILABLE);
  const cacheTracked = records.filter((r) => r.cacheHit !== null && r.cacheHit !== undefined);
  const cacheHits = cacheTracked.filter((r) => r.cacheHit === true);

  return {
    agentId,
    totalExecutions: total,
    successCount: successes.length,
    timeoutCount: timeouts.length,
    failureCount: failures.length,
    unavailableCount: unavailable.length,
    successRate: total ? successes.length / total : 0,
    avgDurationMs: average(records.map((r) => r.durationMs).filter(Number.isFinite)),
    avgRetryCount: average(records.map((r) => r.retryCount).filter(Number.isFinite)),
    avgConfidence: average(successes.map((r) => r.confidence).filter(Number.isFinite)),
    cacheHitRate: cacheTracked.length ? cacheHits.length / cacheTracked.length : null,
    cacheTrackedCount: cacheTracked.length,
  };
}

/**
 * Group an arbitrary list of execution records by agentId and summarize
 * each group, plus one "__all__" rollup across every record given.
 */
function collectMetrics(records) {
  const byAgent = new Map();
  for (const record of records) {
    const key = record.agentId || "unknown";
    if (!byAgent.has(key)) byAgent.set(key, []);
    byAgent.get(key).push(record);
  }

  const perAgent = Array.from(byAgent.entries()).map(([agentId, agentRecords]) => summarizeAgent(agentId, agentRecords));

  return {
    overall: summarizeAgent(null, records),
    perAgent,
  };
}

module.exports = { collectMetrics, summarizeAgent };
