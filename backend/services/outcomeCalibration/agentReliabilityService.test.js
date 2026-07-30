require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const { truncateAll } = require("../../test/dbHelpers");
const { publishAgentClaim } = require("../agentClaimBridge/agentClaimPublisher");
const claimRepository = require("../claimIntelligence/claimRepository");
const claimResolutionService = require("../claimIntelligence/claimResolutionService");
const { createAgentExecutionLog } = require("../agentObservability/agentExecutionLog");
const agentOrchestrator = require("../agentOrchestrator/agentOrchestrator");
const { registerAllAgents } = require("../agentOrchestrator/registry");
const { getAgentReliabilityHistory, getAllAgentsReliabilitySummary, getRecentExecutionSignal } = require("./agentReliabilityService");

test.beforeEach(async () => {
  await truncateAll();
  agentOrchestrator.clearRegistry();
  registerAllAgents();
});

function macroAgentResult() {
  return {
    agentId: "macro",
    agentName: "Macro Intelligence Agent",
    status: "fulfilled",
    confidence: 80,
    direction: "BULLISH",
    result: { summary: "Macro Bias is BULLISH.", evidence: [{ observedFact: "Yield curve is normal." }], raw: {} },
  };
}

test("getAgentReliabilityHistory: honestly reports zero real evidence for an agent that never published", async () => {
  const history = await getAgentReliabilityHistory("valuation");
  assert.equal(history.agentId, "valuation");
  assert.equal(history.totalEvidenceCount, 0);
  assert.equal(history.gradedEvidenceCount, 0);
  assert.equal(history.accuracy.accuracyRate, null);
});

test("getAgentReliabilityHistory: composes real accuracy/calibration/drift from real graded evidence", async () => {
  const published = await publishAgentClaim("AAPL", macroAgentResult(), { now: new Date("2026-07-01T00:00:00Z") });
  const claimId = published.claimResult.claim.id;
  await claimRepository.updateClaimScalars(claimId, { status: "EXPIRED" });
  await claimResolutionService.resolveClaim(claimId, { actualDirection: "BULLISH", windowReturnPct: 3.5 });

  const history = await getAgentReliabilityHistory("macro");
  assert.equal(history.totalEvidenceCount, 1);
  assert.equal(history.gradedEvidenceCount, 1);
  assert.equal(history.accuracy.correctCount, 1);
  assert.equal(history.accuracy.totalCount, 1);
  assert.ok(Number.isFinite(history.calibration.avgCalibrationError));
});

test("getRecentExecutionSignal: reuses the real, existing AgentExecutionLog, filtered to the requested agent", () => {
  const log = createAgentExecutionLog();
  log.append({ agentId: "macro", confidence: 80, success: true });
  log.append({ agentId: "macro", confidence: 60, success: false });
  log.append({ agentId: "insider", confidence: 90, success: true });

  const signal = getRecentExecutionSignal("macro", { log });
  assert.equal(signal.recentExecutionCount, 2);
  assert.equal(signal.recentAvgConfidence, 70);
  assert.equal(signal.recentSuccessRate, 50);
});

test("getRecentExecutionSignal: honestly reports zero recent activity for an agent with no real execution records", () => {
  const log = createAgentExecutionLog();
  const signal = getRecentExecutionSignal("macro", { log });
  assert.equal(signal.recentExecutionCount, 0);
  assert.equal(signal.recentAvgConfidence, null);
});

test("getAllAgentsReliabilitySummary: returns one real history entry per requested agent id", async () => {
  const summaries = await getAllAgentsReliabilitySummary(["macro", "valuation"]);
  assert.equal(summaries.length, 2);
  assert.deepEqual(summaries.map((s) => s.agentId).sort(), ["macro", "valuation"]);
});

test("getAllAgentsReliabilitySummary: defaults to every currently-registered real agent when no ids are given", async () => {
  const summaries = await getAllAgentsReliabilitySummary();
  assert.ok(summaries.length >= 14, "every one of the 14 real Domain Intelligence Agents should be covered by default");
});
