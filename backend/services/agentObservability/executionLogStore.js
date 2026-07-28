// Phase PLATFORM-HARDENING-001 — "Configurable observability storage":
// the actual record-storage mechanics extracted out of
// agentExecutionLog.js into a standalone, swappable store. Today only
// one real implementation exists (in-memory, bounded, indexed) — but
// agentExecutionLog.js now depends only on this module's small
// interface (append/getBySymbol/getByCorrelationId/getByExecutionId/
// recent/size/clear/setMaxRecords/getMaxRecords), so a future phase can
// add a persisted store (e.g. a Prisma model, a file, Redis) and swap it
// in via `createAgentExecutionLog({ store })` without changing any
// caller. No business logic: this stores whatever record shape it is
// given and never interprets agent content.
const DEFAULT_MAX_RECORDS = 5000;

function createInMemoryExecutionLogStore({ maxRecords = DEFAULT_MAX_RECORDS } = {}) {
  let limit = maxRecords;
  /** @type {Array<object>} insertion-ordered, oldest first */
  const records = [];
  const bySymbol = new Map(); // symbol -> array of record refs
  const byCorrelationId = new Map(); // correlationId -> array of record refs
  const byExecutionId = new Map(); // executionId -> record ref

  function indexRecord(record) {
    const symbolKey = record.symbol;
    if (symbolKey) {
      if (!bySymbol.has(symbolKey)) bySymbol.set(symbolKey, []);
      bySymbol.get(symbolKey).push(record);
    }
    if (record.correlationId) {
      if (!byCorrelationId.has(record.correlationId)) byCorrelationId.set(record.correlationId, []);
      byCorrelationId.get(record.correlationId).push(record);
    }
    if (record.executionId) {
      byExecutionId.set(record.executionId, record);
    }
  }

  function unindexRecord(evicted) {
    const symbolList = bySymbol.get(evicted.symbol);
    if (symbolList) {
      const idx = symbolList.indexOf(evicted);
      if (idx !== -1) symbolList.splice(idx, 1);
      if (!symbolList.length) bySymbol.delete(evicted.symbol);
    }
    const corrList = byCorrelationId.get(evicted.correlationId);
    if (corrList) {
      const idx = corrList.indexOf(evicted);
      if (idx !== -1) corrList.splice(idx, 1);
      if (!corrList.length) byCorrelationId.delete(evicted.correlationId);
    }
    byExecutionId.delete(evicted.executionId);
  }

  function evictOverLimit() {
    while (records.length > limit) {
      const evicted = records.shift();
      if (!evicted) break;
      unindexRecord(evicted);
    }
  }

  function append(record) {
    if (!record || typeof record !== "object") {
      throw new Error("AgentExecutionLog.append requires a record object.");
    }
    records.push(record);
    indexRecord(record);
    evictOverLimit();
    return record;
  }

  function getBySymbol(symbol, { limit: queryLimit } = {}) {
    const list = bySymbol.get(String(symbol || "").toUpperCase()) || [];
    return queryLimit ? list.slice(-queryLimit) : list.slice();
  }

  function getByCorrelationId(correlationId) {
    return (byCorrelationId.get(correlationId) || []).slice();
  }

  function getByExecutionId(executionId) {
    return byExecutionId.get(executionId) || null;
  }

  function recent({ limit: queryLimit = 100 } = {}) {
    return records.slice(-queryLimit);
  }

  function size() {
    return records.length;
  }

  function clear() {
    records.length = 0;
    bySymbol.clear();
    byCorrelationId.clear();
    byExecutionId.clear();
  }

  /** Configurable retention: shrinking the limit evicts immediately; growing it just raises the ceiling. */
  function setMaxRecords(newLimit) {
    if (!Number.isFinite(newLimit) || newLimit <= 0) {
      throw new Error("maxRecords must be a positive finite number.");
    }
    limit = newLimit;
    evictOverLimit();
  }

  function getMaxRecords() {
    return limit;
  }

  return { append, getBySymbol, getByCorrelationId, getByExecutionId, recent, size, clear, setMaxRecords, getMaxRecords };
}

module.exports = { createInMemoryExecutionLogStore, DEFAULT_MAX_RECORDS };
