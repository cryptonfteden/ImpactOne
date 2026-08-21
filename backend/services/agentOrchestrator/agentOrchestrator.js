// Phase AGENT-ORCHESTRATOR-001 — the brain of ImpactOne's Stock
// Intelligence pipeline:
//
//   Stock Symbol -> Agent Orchestrator -> Parallel Agent Execution -> Unified Intelligence Report
//
// This module owns exactly the responsibilities the mission names —
// registering agents, requesting their execution, priority-weighted
// aggregation, confidence calculation, conflict detection, and evidence
// merging — and NOTHING else. It never inspects what an agent's
// `summary`/`evidence`/`direction` actually mean; every field beyond the
// four Agent-interface members (agentInterface.js) is opaque to this
// file. Every agent owns its own analysis.
//
// Phase AGENT-SCHEDULER-001 — the actual execution mechanics (health
// checks, per-agent timeout, retry with backoff+jitter, concurrency
// limits, priority/fair queueing, cancellation, duplicate in-flight
// prevention) moved into ../agentScheduler — this file no longer
// implements any of that itself, only asks the scheduler to run().
// This module's own public API (registerAgent/unregisterAgent/
// getRegisteredAgents/clearRegistry/run and the four aggregation
// helpers) is unchanged from AGENT-ORCHESTRATOR-001.
const { assertValidAgent } = require("./agentInterface");
const { sharedScheduler } = require("../agentScheduler/agentScheduler");
const { DEFAULT_TIMEOUT_MS, DEFAULT_MAX_RETRIES } = require("../agentScheduler/schedulerConfig");
const { applyStrategyPriority, policySnapshot } = require("./strategyPolicy");
const { buildPriceEarningsSynthesis } = require("./priceEarningsSynthesis");
const { buildContrarianRegimeSynthesis } = require("./contrarianRegimeSynthesis");
const { isDecisionEligible } = require("./decisionEligibility");
const { summarizeCommittee, normalizeDirection } = require("./committeeDecisionModel");

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
 * Compare normalized investment polarity, so BUY and BULLISH agree while an
 * opaque or missing value casts no vote and creates no false conflict.
 */
function detectConflicts(agentResults) {
  const withDirection = agentResults
    .filter((result) => result.status === "fulfilled" && isDecisionEligible(result))
    .map((result) => ({ ...result, normalizedDirection: normalizeDirection(result.direction) }))
    .filter((result) => ["BULLISH", "BEARISH"].includes(result.normalizedDirection));
  const conflicts = [];
  for (let i = 0; i < withDirection.length; i += 1) {
    for (let j = i + 1; j < withDirection.length; j += 1) {
      if (withDirection[i].normalizedDirection !== withDirection[j].normalizedDirection) {
        conflicts.push({
          agentA: withDirection[i].agentId,
          directionA: withDirection[i].normalizedDirection,
          agentB: withDirection[j].agentId,
          directionB: withDirection[j].normalizedDirection,
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
  const fulfilled = agentResults.filter((result) => result.status === "fulfilled" && isDecisionEligible(result));
  if (!fulfilled.length) return 0;
  const totalWeight = fulfilled.reduce((sum, result) => sum + result.priority, 0);
  if (!totalWeight) return 0;
  const weightedSum = fulfilled.reduce((sum, result) => sum + result.confidence * result.priority, 0);
  return Math.round(weightedSum / totalWeight);
}

/**
 * The one entry point: given a stock symbol, run every requested agent
 * and return one Unified Intelligence Report. `agents` defaults to the
 * full registry; pass an explicit subset for partial runs (e.g. tests,
 * or a future "only technical + options" fast path).
 *
 * Actual execution — health checks, per-agent timeout, retry with
 * backoff, concurrency limiting, priority/fair queueing, duplicate
 * in-flight prevention — is delegated entirely to the shared
 * AgentScheduler (AGENT-SCHEDULER-001). This function still decides
 * WHICH agents run and WHAT to do with their results (ranking,
 * confidence, conflicts, evidence) — never HOW they are scheduled.
 */
async function run(symbol, { agents = getRegisteredAgents(), timeoutMs = DEFAULT_TIMEOUT_MS, maxRetries = DEFAULT_MAX_RETRIES } = {}) {
  if (!symbol || typeof symbol !== "string") {
    const error = new Error("A stock symbol is required.");
    error.statusCode = 400;
    throw error;
  }
  const normalizedSymbol = symbol.trim().toUpperCase();
  const startedAt = Date.now();

  const policyAgents = agents.map(applyStrategyPriority);
  const agentResults = await sharedScheduler.runAll(policyAgents, normalizedSymbol, { timeoutMs, maxRetries });
  const ranked = rankByConfidence(agentResults);
  const strategyCommittee = summarizeCommittee(agentResults, { reportedTotal: policyAgents.length });
  const decisionConfidence = strategyCommittee.direction === "NEUTRAL"
    ? 0
    : Math.round(Math.min(strategyCommittee.confidence, strategyCommittee.conviction) * strategyCommittee.coveragePct / 100);

  return {
    symbol: normalizedSymbol,
    generatedAt: new Date().toISOString(),
    tookMs: Date.now() - startedAt,
    agents: ranked,
    overallConfidence: computeOverallConfidence(agentResults),
    evidenceConfidence: computeOverallConfidence(agentResults),
    decisionDirection: strategyCommittee.direction,
    decisionConfidence,
    strategyPolicy: policySnapshot(),
    decisionSynthesis: {
      committee: strategyCommittee,
      priceAndEarnings: buildPriceEarningsSynthesis(agentResults),
      contrarianRegime: buildContrarianRegimeSynthesis(agentResults),
    },
    conflicts: detectConflicts(agentResults),
    evidence: mergeEvidence(agentResults),
    summary: {
      total: agentResults.length,
      fulfilled: agentResults.filter((result) => result.status === "fulfilled").length,
      unavailable: agentResults.filter((result) => result.status === "unavailable").length,
      failed: agentResults.filter((result) => result.status === "error" || result.status === "timeout").length,
      decisionEligible: agentResults.filter(isDecisionEligible).length,
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
