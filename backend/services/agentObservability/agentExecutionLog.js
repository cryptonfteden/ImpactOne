// Phase AGENT-OBSERVABILITY-001 — AgentExecutionLog: the one place every
// agent execution record is stored. This is infrastructure only — it
// stores whatever record shape it is given and never interprets agent
// business content. In-memory, bounded (never unbounded growth), and
// indexed for O(1)-ish lookup by symbol/correlationId/executionId so it
// stays low-overhead at 100+ agents and high request volume.
//
// A future phase may swap this for a persisted store (e.g. a Prisma
// model) without changing the shape callers depend on — append()/query
// methods are the only contract this module promises.

const DEFAULT_MAX_RECORDS = 5000;

function createAgentExecutionLog({ maxRecords = DEFAULT_MAX_RECORDS } = {}) {
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

  function evictOldestIfNeeded() {
    while (records.length > maxRecords) {
      const evicted = records.shift();
      if (!evicted) break;
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
  }

  /** Append one execution record. Returns the record unchanged (for chaining). */
  function append(record) {
    if (!record || typeof record !== "object") {
      throw new Error("AgentExecutionLog.append requires a record object.");
    }
    records.push(record);
    indexRecord(record);
    evictOldestIfNeeded();
    return record;
  }

  function getBySymbol(symbol, { limit } = {}) {
    const list = bySymbol.get(String(symbol || "").toUpperCase()) || [];
    return limit ? list.slice(-limit) : list.slice();
  }

  function getByCorrelationId(correlationId) {
    return (byCorrelationId.get(correlationId) || []).slice();
  }

  function getByExecutionId(executionId) {
    return byExecutionId.get(executionId) || null;
  }

  function recent({ limit = 100 } = {}) {
    return records.slice(-limit);
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

  return { append, getBySymbol, getByCorrelationId, getByExecutionId, recent, size, clear };
}

// A single shared, process-wide log instance — this is what every real
// request path reads from and writes to. Tests that need isolation
// should call `.clear()` in beforeEach, or construct their own instance
// via createAgentExecutionLog() for full isolation.
const sharedLog = createAgentExecutionLog();

module.exports = { createAgentExecutionLog, sharedLog, DEFAULT_MAX_RECORDS };
