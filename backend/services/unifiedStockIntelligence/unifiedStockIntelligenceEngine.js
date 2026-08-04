// Phase UNIFIED-STOCK-INTELLIGENCE-001 — "Build the first Unified Stock
// Intelligence engine." Aggregates the real, already-built Options Flow
// (OPTIONS-AGENT-001), Earnings (EARNINGS-AGENT-001), and Valuation
// (VALUATION-AGENT-001) Domain Intelligence Agents into one normalized,
// explainable report.
//
// "Compatible with Agent Registry / Scheduler / Observability /
// Orchestrator" is satisfied for real, not reimplemented: this engine
// selects its three target agents from the live registry
// (agentSelector.js) and executes them through the exact same
// `runObserved()` seam every other real request already uses — which
// itself runs through the unmodified Agent Orchestrator, the real
// AgentScheduler (concurrency/health-cache/retry), and the real
// AgentObservability execution log. No duplicate scheduling/execution
// logic exists in this file.
const agentOrchestrator = require("../agentOrchestrator/agentOrchestrator");
const { registerAllAgents } = require("../agentOrchestrator/registry");
const { runObserved } = require("../agentObservability/observableOrchestrator");
const { selectUnifiedIntelligenceAgents } = require("./agentSelector");
const { mapAgentResult } = require("./agentDirectionMapper");
const { detectConflicts } = require("./conflictDetector");
const { aggregate } = require("./weightedAggregationEngine");
const { buildBullCase, buildBearCase, buildRisks, buildOpportunities } = require("./caseBuilder");
const { buildKeyDrivers } = require("./keyDriversBuilder");
const { buildAiExecutiveSummary } = require("./aiExecutiveSummary");

// Registering agents is itself idempotent (registry.js's own
// registerAllAgents() checks the orchestrator's real current state) —
// safe to call here so this engine works standalone in a fresh process,
// exactly like agentOrchestratorController.js already does.
registerAllAgents();

/**
 * Generates the Unified Stock Intelligence report for one symbol.
 * `orchestrator`/`runObservedFn` are injectable for tests only — real
 * callers should never need to override them.
 */
async function generateUnifiedIntelligence(symbol, { orchestrator = agentOrchestrator, runObservedFn = runObserved, correlationId } = {}) {
  const agents = selectUnifiedIntelligenceAgents(orchestrator);
  // Phase CLAIM-INTELLIGENCE-INTEGRATION-001 — this is the one real
  // production surface that already exercises every Domain Intelligence
  // Agent together, so it's the natural place to turn on
  // `publishClaims`. This only ADDS a best-effort, additive Bus/Claim
  // publish per agent inside `runObserved` (see its own header) — it
  // never changes `orchestratorReport` or anything computed from it
  // below, so this engine's own scoring/aggregation is provably
  // untouched by this flag.
  const { report: orchestratorReport, correlationId: usedCorrelationId } = await runObservedFn(symbol, { agents }, { correlationId, publishClaims: true });

  const normalizedAgents = orchestratorReport.agents.map(mapAgentResult);
  const conflictingSignals = detectConflicts(normalizedAgents);
  const { overallIntelligence, overallConfidence, recommendationConfidence, normalizedScore, contributions } = aggregate(normalizedAgents, conflictingSignals);

  const bullCase = buildBullCase(normalizedAgents);
  const bearCase = buildBearCase(normalizedAgents);
  const risks = buildRisks(normalizedAgents);
  const opportunities = buildOpportunities(normalizedAgents);
  const keyDrivers = buildKeyDrivers(contributions);

  const report = {
    symbol: orchestratorReport.symbol,
    generatedAt: orchestratorReport.generatedAt,
    correlationId: usedCorrelationId,
    contributingAgentCount: normalizedAgents.filter((agent) => agent.available).length,
    totalAgentCount: normalizedAgents.length,
    overallIntelligence,
    overallConfidence,
    recommendationConfidence,
    bullCase,
    bearCase,
    risks,
    opportunities,
    conflictingSignals,
    keyDrivers,
    // Retained for auditability/debugging — "every conclusion must be
    // traceable to source agents": the full per-agent normalized view
    // and the raw orchestrator report are both preserved.
    agentContributions: normalizedAgents,
    normalizedScore,
    inputs: orchestratorReport,
  };
  report.aiExecutiveSummary = buildAiExecutiveSummary(report);
  return report;
}

module.exports = { generateUnifiedIntelligence };
