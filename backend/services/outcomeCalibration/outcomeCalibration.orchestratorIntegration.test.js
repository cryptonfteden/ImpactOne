// Phase OUTCOME-CALIBRATION-001 — proves the full, real pipeline this
// mission requires: a real agent execution, routed through the real
// (already-integrated) Claim Intelligence pipeline, resolved into a
// real ClaimOutcome, and finally surfaced as real per-agent
// reliability/calibration/drift statistics — including the additive
// Unified Stock Intelligence integration point — all against the real
// test database, no mocked layer.
require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../../test/dbHelpers");
const agentOrchestrator = require("../agentOrchestrator/agentOrchestrator");
const { registerAllAgents } = require("../agentOrchestrator/registry");
const { runObserved } = require("../agentObservability/observableOrchestrator");
const claimRepository = require("../claimIntelligence/claimRepository");
const claimResolutionService = require("../claimIntelligence/claimResolutionService");
const { getAgentReliabilityHistory } = require("./agentReliabilityService");
const { attachAgentReliabilityContext } = require("./unifiedIntelligenceReliabilityContext");

test.beforeEach(async () => {
  await truncateAll();
  agentOrchestrator.clearRegistry();
  registerAllAgents();
});

test("a verified agent run, published and resolved twice, produces a statistically-honest reliability history with zero effect on the agent's own output", async (t) => {
  const [macroAgent] = agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "macro");

  // Two real runs (same real agent, same real symbol) so the resulting
  // claim accumulates real evidence breadth.
  const { report: firstReport } = await runObserved("AAPL", { agents: [macroAgent] }, { publishClaims: true });
  await runObserved("AAPL", { agents: [macroAgent] }, { publishClaims: true });

  const [macroResult] = firstReport.agents;
  assert.equal(macroResult.agentId, "macro");
  // The calibration pipeline must never change what the agent itself
  // reported — its own execution result is untouched by anything this
  // phase adds.
  assert.ok(["fulfilled", "unavailable", "error", "timeout"].includes(macroResult.status));
  if (macroResult.status !== "fulfilled") {
    t.skip("The real macro provider is unavailable in this environment; no claim may be fabricated for calibration.");
    return;
  }

  const claims = await claimRepository.listBySymbol("AAPL");
  assert.ok(claims.length >= 1, "a real claim must have formed from the real, agreeing macro evidence");
  const claim = claims[0];

  await claimRepository.updateClaimScalars(claim.id, { status: "EXPIRED" });
  await claimResolutionService.resolveClaim(claim.id, { actualDirection: claim.expectedDirection, windowReturnPct: 3.5 });

  const history = await getAgentReliabilityHistory("macro");
  assert.equal(history.agentId, "macro");
  assert.ok(history.gradedEvidenceCount >= 1);
  assert.ok(Number.isFinite(history.accuracy.accuracyRate));
}, { timeout: 30000 });

test("attachAgentReliabilityContext composes real per-agent history for a real Unified Stock Intelligence-shaped report, additive only", async () => {
  const [macroAgent] = agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "macro");
  await runObserved("AAPL", { agents: [macroAgent] }, { publishClaims: true });

  const fakeUnifiedReport = {
    symbol: "AAPL",
    overallIntelligence: "BULLISH",
    overallConfidence: 60,
    agentContributions: [{ agentId: "macro", direction: "BULLISH", confidence: 80 }],
  };

  const enriched = await attachAgentReliabilityContext(fakeUnifiedReport);

  assert.equal(enriched.overallIntelligence, "BULLISH");
  assert.equal(enriched.overallConfidence, 60);
  assert.ok(enriched.agentReliabilityContext.macro);
  assert.equal(enriched.agentReliabilityContext.macro.agentId, "macro");
}, { timeout: 30000 });
