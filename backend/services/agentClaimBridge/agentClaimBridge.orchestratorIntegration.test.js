// Phase CLAIM-INTELLIGENCE-INTEGRATION-001 — proves the full, real
// pipeline this mission requires: a real agent execution (through the
// real, unmodified Agent Orchestrator + AgentScheduler +
// AgentObservability), routed by `agentClaimPublisher` into a real
// Intelligence Bus event, then into a real Claim Intelligence Claim,
// finally visible through the real `/api/v2/claims/*` HTTP routes —
// not a mocked stand-in at any layer.
require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const { truncateAll } = require("../../test/dbHelpers");
const app = require("../../app");
const agentOrchestrator = require("../agentOrchestrator/agentOrchestrator");
const { registerAllAgents } = require("../agentOrchestrator/registry");
const { runObserved } = require("../agentObservability/observableOrchestrator");
const intelligenceBusService = require("../intelligenceBus/intelligenceBusService");
const claimConsumerService = require("../claimIntelligence/claimConsumerService");
const { publishAgentClaim } = require("./agentClaimPublisher");

test.beforeEach(async () => {
  await truncateAll();
  agentOrchestrator.clearRegistry();
  registerAllAgents();
});

test("runObserved with publishClaims:true publishes a real Bus event for a real, fulfilled agent execution", async () => {
  const [macroAgent] = agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "macro");
  assert.ok(macroAgent, "the macro agent must be registered");

  await runObserved("AAPL", { agents: [macroAgent] }, { publishClaims: true });

  const events = await intelligenceBusService.getEvents({ symbol: "AAPL", engineId: "macro" });
  assert.equal(events.length, 1);
  assert.equal(events[0].engineId, "macro");
  assert.equal(typeof events[0].payload.direction, "string");
  assert.equal(events[0].label, "Signal — not a recommendation");
}, { timeout: 30000 });

test("two real, directionally-agreeing publishes from the same engine accumulate real evidence and reach the real, public /api/v2/claims/active route", async () => {
  const now1 = new Date("2026-07-30T10:00:00.000Z");
  const now2 = new Date("2026-07-30T11:00:00.000Z");

  const agentResult = {
    agentId: "macro",
    agentName: "Macro Intelligence Agent",
    status: "fulfilled",
    confidence: 80,
    direction: "BULLISH",
    result: { summary: "Macro Bias is BULLISH.", evidence: [{ observedFact: "Yield curve is normal." }], raw: {} },
  };

  const first = await publishAgentClaim("AAPL", agentResult, { now: now1 });
  assert.equal(first.skipped, false);
  assert.equal(first.claimResult.action, "created");

  const second = await publishAgentClaim("AAPL", agentResult, { now: now2 });
  assert.equal(second.skipped, false);
  // Same engine, same direction, same causal context, same time horizon
  // => the real SAME claim series (claimIdentity.computeIdentityKey),
  // so the second real evidence entry updates the SAME claim rather
  // than creating a second, independent one.
  assert.equal(second.claimResult.claim.id, first.claimResult.claim.id);
  assert.equal(second.claimResult.action, "updated");

  const response = await request(app).get("/api/v2/claims/active");
  assert.equal(response.status, 200);
  assert.equal(response.body.claims.length, 1, "2 real, agreeing evidence entries must meet MIN_EVIDENCE_BREADTH_FOR_ACTIVE and promote the claim to ACTIVE");
  assert.equal(response.body.claims[0].symbols[0], "AAPL");

  const bySymbol = await claimConsumerService.getClaimsBySymbol("AAPL");
  assert.ok(bySymbol.length >= 1);
}, { timeout: 30000 });

test("a real published event never carries a forbidden governance key end-to-end (Bus event AND the resulting Claim)", async () => {
  const agentResult = {
    agentId: "insider",
    agentName: "Insider Intelligence Agent",
    status: "fulfilled",
    confidence: 65,
    direction: "BEARISH",
    result: { summary: "Insider activity is bearish.", evidence: [{ observedFact: "Cluster selling detected." }], raw: {} },
  };
  const outcome = await publishAgentClaim("MSFT", agentResult);
  assert.equal(outcome.skipped, false);

  const forbidden = ["action", "decision", "verdict", "finalDecision", "recommendation"];
  const serializedEvent = JSON.stringify(outcome.publishedEvent);
  const serializedClaim = JSON.stringify(outcome.claimResult.claim);
  for (const key of forbidden) {
    assert.ok(!new RegExp(`"${key}"\\s*:`).test(serializedEvent), `Bus event must not contain forbidden key "${key}"`);
    assert.ok(!new RegExp(`"${key}"\\s*:`).test(serializedClaim), `Claim must not contain forbidden key "${key}"`);
  }
}, { timeout: 30000 });

test("an agent whose orchestrator run resulted in an unavailable/error status never publishes a fabricated claim", async () => {
  const agentResult = { agentId: "macro", agentName: "Macro Intelligence Agent", status: "unavailable", confidence: 0, direction: null, result: null };
  const outcome = await publishAgentClaim("AAPL", agentResult);
  assert.equal(outcome.skipped, true);

  const events = await intelligenceBusService.getEvents({ symbol: "AAPL" });
  assert.equal(events.length, 0);
}, { timeout: 30000 });
