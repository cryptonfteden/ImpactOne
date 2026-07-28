// Phase AGENT-OBSERVABILITY-001 — the seam between the Agent
// Orchestrator and the observability layer. This module calls the real,
// unmodified agentOrchestrator.run() (no changes to that file — the
// orchestrator itself stays exactly as narrow as AGENT-ORCHESTRATOR-001
// left it) and, from its already-returned report, derives one
// AgentExecutionLog record per agent plus one correlation id for the
// whole run. It adds zero business logic: every field it writes is
// either copied verbatim from the orchestrator's own opaque per-agent
// result, or a generic timing/identity value.
const agentOrchestrator = require("../agentOrchestrator/agentOrchestrator");
const { newCorrelationId, newExecutionId } = require("./correlationModel");
const { classify } = require("./failureTaxonomy");
const { sharedLog } = require("./agentExecutionLog");

/**
 * Best-effort, forward-compatible extraction of cache/data-source
 * signals an agent MAY choose to report on its own `raw` result. No
 * agent is required to provide these — when absent, the record honestly
 * carries `null` (unknown), never a fabricated guess.
 */
function extractCacheHit(agentResult) {
  const raw = agentResult?.result?.raw;
  if (raw && typeof raw === "object" && typeof raw.cacheHit === "boolean") return raw.cacheHit;
  if (raw && typeof raw === "object" && typeof raw.fromCache === "boolean") return raw.fromCache;
  return null;
}

function extractDataSources(agentResult) {
  const raw = agentResult?.result?.raw;
  if (raw && typeof raw === "object" && Array.isArray(raw.dataSources)) return raw.dataSources;
  if (raw && typeof raw === "object" && Array.isArray(raw.sources)) return raw.sources;
  return null;
}

/**
 * Runs the orchestrator exactly as `agentOrchestrator.run()` would, and
 * additionally appends one execution record per agent to the shared
 * AgentExecutionLog. Returns the orchestrator's own report unmodified,
 * plus the correlationId this run was recorded under.
 *
 * Phase PLATFORM-HARDENING-001 — "Correlation ID propagation end-to-end":
 * a caller may now pass in an already-known `correlationId` (e.g. one
 * that arrived on an inbound request header) so every execution record
 * this run produces is filed under the SAME id the caller already has,
 * rather than a fresh one only this function knows about. When none is
 * given, a new one is generated exactly as before — fully backward
 * compatible with every existing caller.
 */
async function runObserved(symbol, options = {}, { log = sharedLog, correlationId: providedCorrelationId } = {}) {
  const correlationId = providedCorrelationId || newCorrelationId();
  const runStartMs = Date.now();

  const report = await agentOrchestrator.run(symbol, options);

  const runEndMs = runStartMs + report.tookMs;

  for (const agentResult of report.agents) {
    const startedAtMs = runStartMs; // every agent is dispatched together via Promise.all
    const endedAtMs = startedAtMs + (agentResult.tookMs ?? 0);
    const failureCode = classify(agentResult);
    const retryCount = Math.max(0, (agentResult.attempts ?? 1) - 1);

    log.append({
      executionId: newExecutionId(),
      correlationId,
      agentId: agentResult.agentId,
      agentName: agentResult.agentName,
      symbol: report.symbol,
      startedAtMs,
      endedAtMs,
      startedAtIso: new Date(startedAtMs).toISOString(),
      endedAtIso: new Date(endedAtMs).toISOString(),
      durationMs: agentResult.tookMs ?? 0,
      success: agentResult.status === "fulfilled",
      timeout: agentResult.status === "timeout",
      retryCount,
      healthStatus: agentResult.health?.status ?? "unknown",
      confidence: agentResult.confidence ?? 0,
      cacheHit: extractCacheHit(agentResult),
      dataSourcesUsed: extractDataSources(agentResult),
      failureCode,
      error: agentResult.error ?? null,
    });
  }

  return { report, correlationId, runStartMs, runEndMs };
}

module.exports = { runObserved };
