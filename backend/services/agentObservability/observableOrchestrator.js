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
const agentClaimPublisher = require("../agentClaimBridge/agentClaimPublisher");

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
 *
 * Phase CLAIM-INTELLIGENCE-INTEGRATION-001 — "Connect every Intelligence
 * Agent to the Claim Intelligence pipeline." An opt-in `publishClaims`
 * flag (default `false`, so every pre-existing caller/test keeps its
 * exact current behavior with zero new side effects) additionally
 * routes each real, fulfilled agent result into the Intelligence Bus and
 * Claim Intelligence layer via `agentClaimBridge.publishAgentClaim` —
 * strictly additive to this per-agent loop, which already has
 * everything the bridge needs (`agentResult.agentId`, `.result`,
 * `.confidence`, `.status`) with no new computation. Publishing is
 * best-effort and never throws (see `publishAgentClaim`'s own header),
 * so it can never change `report`, `correlationId`, or any existing
 * return value — this function still returns exactly what it always has.
 */
async function runObserved(symbol, options = {}, { log = sharedLog, correlationId: providedCorrelationId, publishClaims = false } = {}) {
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

    if (publishClaims) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await agentClaimPublisher.publishAgentClaim(report.symbol, agentResult);
      } catch {
        // Defense in depth — publishAgentClaim itself is already
        // best-effort and should never throw (see its own header), but
        // this run must never fail because of a Claim-pipeline problem
        // regardless, so a real exception here is swallowed rather than
        // propagated to this function's own caller.
      }
    }
  }

  return { report, correlationId, runStartMs, runEndMs };
}

module.exports = { runObserved };
