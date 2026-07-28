// Phase AGENT-OBSERVABILITY-001 — turns a flat list of execution records
// into a chronological timeline: who ran, when, for how long, relative
// to the earliest event in the set. Presentation/ordering only — no
// interpretation of agent business content.

/**
 * @param {Array<object>} records - execution records (any source: one
 *   symbol, one correlationId, or an arbitrary set)
 * @returns {{ startedAtMs: number|null, endedAtMs: number|null, totalDurationMs: number, events: Array<object> }}
 */
function buildTimeline(records) {
  if (!records || !records.length) {
    return { startedAtMs: null, endedAtMs: null, totalDurationMs: 0, events: [] };
  }

  const sorted = [...records].sort((a, b) => a.startedAtMs - b.startedAtMs);
  const startedAtMs = sorted[0].startedAtMs;
  const endedAtMs = Math.max(...sorted.map((r) => r.endedAtMs ?? r.startedAtMs));

  const events = sorted.map((record) => ({
    executionId: record.executionId,
    correlationId: record.correlationId,
    agentId: record.agentId,
    agentName: record.agentName,
    symbol: record.symbol,
    offsetMs: record.startedAtMs - startedAtMs,
    durationMs: record.durationMs,
    success: record.success,
    timeout: record.timeout,
    retryCount: record.retryCount,
    healthStatus: record.healthStatus,
    confidence: record.confidence,
    failureCode: record.failureCode,
    cacheHit: record.cacheHit,
    dataSourcesUsed: record.dataSourcesUsed,
  }));

  return {
    startedAtMs,
    endedAtMs,
    totalDurationMs: endedAtMs - startedAtMs,
    events,
  };
}

module.exports = { buildTimeline };
