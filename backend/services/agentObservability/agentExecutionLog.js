// Phase AGENT-OBSERVABILITY-001 — AgentExecutionLog: the one place every
// agent execution record is stored. This is infrastructure only — it
// stores whatever record shape it is given and never interprets agent
// business content.
//
// Phase PLATFORM-HARDENING-001 — "Configurable observability storage"
// and "configurable retention policies": the actual storage mechanics
// now live in executionLogStore.js behind a small, swappable interface
// (`store`), and the retention bound (maxRecords) can be read from an
// environment variable at process start, or changed at runtime via
// setMaxRecords() — no restart required, no caller-visible change.
const { createInMemoryExecutionLogStore, DEFAULT_MAX_RECORDS } = require("./executionLogStore");

function resolveDefaultMaxRecords() {
  const raw = process.env.AGENT_OBSERVABILITY_MAX_RECORDS;
  if (raw === undefined || raw === "") return DEFAULT_MAX_RECORDS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_RECORDS;
}

/**
 * @param {{ maxRecords?: number, store?: object }} options - `store` lets
 *   a caller (or a future phase) supply an alternative backing store
 *   implementing the same interface as executionLogStore.js's in-memory
 *   one (e.g. a persisted store); defaults to a fresh in-memory store
 *   sized by `maxRecords` (falling back to the env-configured default).
 */
function createAgentExecutionLog({ maxRecords = resolveDefaultMaxRecords(), store } = {}) {
  const backingStore = store || createInMemoryExecutionLogStore({ maxRecords });

  return {
    append: (record) => backingStore.append(record),
    getBySymbol: (symbol, options) => backingStore.getBySymbol(symbol, options),
    getByCorrelationId: (correlationId) => backingStore.getByCorrelationId(correlationId),
    getByExecutionId: (executionId) => backingStore.getByExecutionId(executionId),
    recent: (options) => backingStore.recent(options),
    size: () => backingStore.size(),
    clear: () => backingStore.clear(),
    setMaxRecords: (n) => backingStore.setMaxRecords(n),
    getMaxRecords: () => backingStore.getMaxRecords(),
  };
}

// A single shared, process-wide log instance — this is what every real
// request path reads from and writes to. Tests that need isolation
// should call `.clear()` in beforeEach, or construct their own instance
// via createAgentExecutionLog() for full isolation.
const sharedLog = createAgentExecutionLog();

module.exports = { createAgentExecutionLog, sharedLog, DEFAULT_MAX_RECORDS };
