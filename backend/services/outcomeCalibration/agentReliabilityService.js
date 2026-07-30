// Phase OUTCOME-CALIBRATION-001 — "Build the Outcome Calibration
// Engine." This is the one composing entry point: "Agent reliability
// history" (this mission's own genuinely new requirement — confirmed
// via a dedicated research pass that no existing service joins the
// Claim layer's durable, already-graded outcomes back to a specific
// agent). Every real number here comes from an existing, unmodified
// source — this module only joins and aggregates; it invents no new
// ground truth and never touches any existing agent's scoring.
const { getRegisteredAgents } = require("../agentOrchestrator/agentOrchestrator");
const { sharedLog } = require("../agentObservability/agentExecutionLog");
const agentReliabilityRepository = require("./agentReliabilityRepository");
const { aggregateAccuracy } = require("./agentAccuracyTracker");
const { aggregateCalibration } = require("./agentCalibrationStatistics");
const { detectDrift } = require("./agentDriftDetector");

/**
 * "Agent reliability history" (recent activity signal) — reuses the
 * existing, real AgentExecutionLog (`agentObservability`) rather than
 * a new store. This is a live, in-memory, bounded-recency complement to
 * the durable Claim-based history below (see agentExecutionLog.js's own
 * header: it is bounded and evicts oldest records, so it is a recent
 * window, not a full history) — never a replacement for it.
 *
 * @param {string} agentId
 * @param {{ log?: object, limit?: number }} [options]
 * @returns {{ recentExecutionCount: number, recentAvgConfidence: number|null, recentSuccessRate: number|null }}
 */
function getRecentExecutionSignal(agentId, { log = sharedLog, limit = 200 } = {}) {
  const recentRecords = log.recent({ limit }).filter((record) => record.agentId === agentId);
  if (!recentRecords.length) {
    return { recentExecutionCount: 0, recentAvgConfidence: null, recentSuccessRate: null };
  }

  const recentAvgConfidence = Math.round((recentRecords.reduce((sum, record) => sum + (record.confidence || 0), 0) / recentRecords.length) * 100) / 100;
  const recentSuccessRate = Math.round((recentRecords.filter((record) => record.success).length / recentRecords.length) * 10000) / 100;

  return { recentExecutionCount: recentRecords.length, recentAvgConfidence, recentSuccessRate };
}

/**
 * The full real reliability history for one real agent: real accuracy
 * (from the Claim layer's own already-graded directionCorrect), real
 * calibration (this agent's evidence-level confidence vs. real
 * outcome), real drift (is calibration getting better or worse over
 * real time), plus a live recent-activity signal from Observability.
 *
 * @param {string} agentId
 * @param {{ limit?: number, log?: object }} [options]
 */
async function getAgentReliabilityHistory(agentId, { limit = 500, log = sharedLog } = {}) {
  const enrichedEvidence = await agentReliabilityRepository.listEnrichedEvidenceForEngine(agentId, { limit });
  const gradedEvidence = enrichedEvidence.filter((entry) => entry.directionCorrect !== null && entry.directionCorrect !== undefined);

  const accuracy = aggregateAccuracy(gradedEvidence);
  const calibration = aggregateCalibration(gradedEvidence);
  const drift = detectDrift(gradedEvidence);
  const recentActivity = getRecentExecutionSignal(agentId, { log });

  return {
    agentId,
    generatedAt: new Date().toISOString(),
    totalEvidenceCount: enrichedEvidence.length,
    gradedEvidenceCount: gradedEvidence.length,
    accuracy,
    calibration,
    drift,
    recentActivity,
  };
}

/**
 * @param {string[]} [agentIds] - defaults to every currently-registered real agent id
 */
async function getAllAgentsReliabilitySummary(agentIds) {
  const ids = agentIds && agentIds.length ? agentIds : getRegisteredAgents().map((agent) => agent.metadata.id);
  const summaries = await Promise.all(ids.map((agentId) => getAgentReliabilityHistory(agentId)));
  return summaries;
}

module.exports = { getAgentReliabilityHistory, getAllAgentsReliabilitySummary, getRecentExecutionSignal };
