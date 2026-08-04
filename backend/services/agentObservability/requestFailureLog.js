// Phase PLATFORM-HARDENING-001 — "Request-level failure logging": a
// small, bounded, in-memory log of REQUEST failures (a thrown error, a
// bad-input 400, an unexpected 500) — distinct from AgentExecutionLog,
// which already records every individual AGENT execution's own
// success/failure at finer grain. This log answers a different
// question: "did the request itself fail, and why", tagged with the
// same correlationId so the two logs can be cross-referenced. No
// business logic: this stores whatever failure description it is given.
function resolveDefaultMaxRecords() {
  const raw = process.env.AGENT_OBSERVABILITY_FAILURE_LOG_MAX_RECORDS;
  if (raw === undefined || raw === "") return 1000;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1000;
}

function createRequestFailureLog({ maxRecords = resolveDefaultMaxRecords() } = {}) {
  let limit = maxRecords;
  const records = [];

  /** @param {{ correlationId: string, route: string, symbol?: string, statusCode?: number, message: string }} entry */
  function append(entry) {
    if (!entry || typeof entry !== "object") {
      throw new Error("RequestFailureLog.append requires an entry object.");
    }
    const record = { timestamp: new Date().toISOString(), ...entry };
    records.push(record);
    while (records.length > limit) records.shift();
    return record;
  }

  function recent({ limit: queryLimit = 100 } = {}) {
    return records.slice(-queryLimit);
  }

  function getByCorrelationId(correlationId) {
    return records.filter((record) => record.correlationId === correlationId);
  }

  function size() {
    return records.length;
  }

  function clear() {
    records.length = 0;
  }

  function setMaxRecords(newLimit) {
    if (!Number.isFinite(newLimit) || newLimit <= 0) {
      throw new Error("maxRecords must be a positive finite number.");
    }
    limit = newLimit;
    while (records.length > limit) records.shift();
  }

  function getMaxRecords() {
    return limit;
  }

  return { append, recent, getByCorrelationId, size, clear, setMaxRecords, getMaxRecords };
}

const sharedRequestFailureLog = createRequestFailureLog();

module.exports = { createRequestFailureLog, sharedRequestFailureLog };
