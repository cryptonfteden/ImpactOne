// Phase AGENT-ORCHESTRATOR-001 — the brain of ImpactOne's Stock
// Intelligence pipeline:
//
//   Stock Symbol -> Agent Orchestrator -> Parallel Agent Execution -> Unified Intelligence Report
//
// This module owns exactly the responsibilities the mission names —
// scheduling, timeouts, health monitoring, retry policy, priority-
// weighted aggregation, confidence calculation, conflict detection, and
// evidence merging — and NOTHING else. It never inspects what an
// agent's `summary`/`evidence`/`direction` actually mean; every field
// beyond the four Agent-interface members (agentInterface.js) is opaque
// to this file. Every agent owns its own analysis.
const { assertValidAgent, isValidHealthResult } = require("./agentInterface");

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_MAX_RETRIES = 1;

const registry = new Map();

function registerAgent(agent) {
  assertValidAgent(agent);
  if (registry.has(agent.metadata.id)) {
    throw new Error(`An agent with id "${agent.metadata.id}" is already registered.`);
  }
  registry.set(agent.metadata.id, agent);
}

function unregisterAgent(agentId) {
  registry.delete(agentId);
}

function getRegisteredAgents() {
  return Array.from(registry.values());
}

function clearRegistry() {
  registry.clear();
}

function withTimeout(promise, timeoutMs) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("TIMEOUT")), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function safeHealth(agent) {
  try {
    const health = await agent.health();
    if (!isValidHealthResult(health)) {
      return { status: "degraded", reason: "health() returned a malformed result." };
    }
    return health;
  } catch (error) {
    return { status: "unavailable", reason: error?.message || "health() threw an error." };
  }
}

/**
 * Runs one agent through the full scheduling policy: health check first
 * (skips execute() entirely when unavailable — an agent the orchestrator
 * already knows can't answer is never invoked "just to see"), then
 * execute() under a timeout, retried up to `maxRetries` additional times
 * on failure or timeout. Never throws — every outcome, including a
 * malformed agent or a thrown health()/execute(), resolves to a real,
 * inspectable result record.
 */
async function runOneAgent(agent, symbol, { timeoutMs, maxRetries }) {
  const startedAt = Date.now();
  const base = { agentId: agent.metadata.id, agentName: agent.metadata.name, category: agent.metadata.category ?? null, priority: agent.metadata.priority };

  const health = await safeHealth(agent);
  if (health.status === "unavailable") {
    return { ...base, status: "unavailable", health, confidence: 0, evidence: [], direction: null, attempts: 0, tookMs: Date.now() - startedAt };
  }

  let attempts = 0;
  let lastError = null;
  while (attempts <= maxRetries) {
    attempts += 1;
    try {
      // eslint-disable-next-line no-await-in-loop
      const result = await withTimeout(Promise.resolve().then(() => agent.execute(symbol)), timeoutMs);
      const confidence = Number(agent.confidence(result));
      return {
        ...base,
        status: "fulfilled",
        health,
        result,
        confidence: Number.isFinite(confidence) ? confidence : 0,
        evidence: Array.isArray(result?.evidence) ? result.evidence : [],
        direction: result?.direction ?? null,
        attempts,
        tookMs: Date.now() - startedAt,
      };
    } catch (error) {
      lastError = error;
    }
  }

  const isTimeout = lastError?.message === "TIMEOUT";
  return {
    ...base,
    status: isTimeout ? "timeout" : "error",
    health,
    error: lastError?.message || "Unknown error.",
    confidence: 0,
    evidence: [],
    direction: null,
    attempts,
    tookMs: Date.now() - startedAt,
  };
}

// ---------------------------------------------------------------------
// Aggregation — ranking, confidence, conflicts, evidence. Every function
// here is presentation/aggregation-only over the opaque per-agent result
// records above; none of them interpret what an agent's own findings mean.
// ---------------------------------------------------------------------

function rankByConfidence(agentResults) {
  return [...agentResults].sort((a, b) => (b.confidence ?? -1) - (a.confidence ?? -1) || (b.priority ?? 0) - (a.priority ?? 0));
}

function mergeEvidence(agentResults) {
  return agentResults.flatMap((result) => (result.evidence || []).map((entry) => ({ ...entry, agentId: result.agentId, agentName: result.agentName })));
}

/**
 * Structural only: two agents "conflict" when both successfully reported
 * a non-null `direction` and those strings differ. The orchestrator has
 * no idea what "BULLISH" vs "a rising anomaly score" means — it only
 * compares the two opaque strings for equality.
 */
function detectConflicts(agentResults) {
  const withDirection = agentResults.filter((result) => result.status === "fulfilled" && result.direction);
  const conflicts = [];
  for (let i = 0; i < withDirection.length; i += 1) {
    for (let j = i + 1; j < withDirection.length; j += 1) {
      if (withDirection[i].direction !== withDirection[j].direction) {
        conflicts.push({
          agentA: withDirection[i].agentId,
          directionA: withDirection[i].direction,
          agentB: withDirection[j].agentId,
          directionB: withDirection[j].direction,
        });
      }
    }
  }
  return conflicts;
}

/**
 * A transparent, priority-weighted average of every successful agent's
 * own confidence() — never a silently "the AI decided" number. The full
 * per-agent breakdown is always returned alongside it (see run()), so
 * this summary is always checkable against its real inputs, never the
 * only thing surfaced.
 */
function computeOverallConfidence(agentResults) {
  const fulfilled = agentResults.filter((result) => result.status === "fulfilled");
  if (!fulfilled.length) return 0;
  const totalWeight = fulfilled.reduce((sum, result) => sum + result.priority, 0);
  if (!totalWeight) return 0;
  const weightedSum = fulfilled.reduce((sum, result) => sum + result.confidence * result.priority, 0);
  return Math.round(weightedSum / totalWeight);
}

/**
 * The one entry point: given a stock symbol, run every requested agent
 * in parallel and return one Unified Intelligence Report. `agents`
 * defaults to the full registry; pass an explicit subset for partial
 * runs (e.g. tests, or a future "only technical + options" fast path).
 */
async function run(symbol, { agents = getRegisteredAgents(), timeoutMs = DEFAULT_TIMEOUT_MS, maxRetries = DEFAULT_MAX_RETRIES } = {}) {
  if (!symbol || typeof symbol !== "string") {
    const error = new Error("A stock symbol is required.");
    error.statusCode = 400;
    throw error;
  }
  const normalizedSymbol = symbol.trim().toUpperCase();
  const startedAt = Date.now();

  const agentResults = await Promise.all(agents.map((agent) => runOneAgent(agent, normalizedSymbol, { timeoutMs, maxRetries })));
  const ranked = rankByConfidence(agentResults);

  return {
    symbol: normalizedSymbol,
    generatedAt: new Date().toISOString(),
    tookMs: Date.now() - startedAt,
    agents: ranked,
    overallConfidence: computeOverallConfidence(agentResults),
    conflicts: detectConflicts(agentResults),
    evidence: mergeEvidence(agentResults),
    summary: {
      total: agentResults.length,
      fulfilled: agentResults.filter((result) => result.status === "fulfilled").length,
      unavailable: agentResults.filter((result) => result.status === "unavailable").length,
      failed: agentResults.filter((result) => result.status === "error" || result.status === "timeout").length,
    },
  };
}

module.exports = {
  registerAgent,
  unregisterAgent,
  getRegisteredAgents,
  clearRegistry,
  run,
  // exported for direct unit testing of the aggregation primitives
  rankByConfidence,
  mergeEvidence,
  detectConflicts,
  computeOverallConfidence,
};
