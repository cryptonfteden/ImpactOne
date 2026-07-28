// Phase AGENT-OBSERVABILITY-001 — a fixed, closed vocabulary for why an
// agent execution did not succeed. This module classifies the
// orchestrator's own opaque `status` field (and, where present, its
// `error` message) into one stable taxonomy code — it never inspects an
// agent's business content (summary/raw/evidence), only the generic
// execution outcome every agent produces regardless of what it analyzes.
const FAILURE_CODES = Object.freeze({
  NONE: "NONE",
  AGENT_UNAVAILABLE: "AGENT_UNAVAILABLE",
  TIMEOUT: "TIMEOUT",
  AGENT_ERROR: "AGENT_ERROR",
  UNKNOWN: "UNKNOWN",
});

/**
 * @param {{status: string, error?: string}} record - a per-agent result
 *   record shaped like agentOrchestrator.run()'s `report.agents[i]`.
 * @returns {string} one of FAILURE_CODES
 */
function classify(record) {
  if (!record || typeof record !== "object") return FAILURE_CODES.UNKNOWN;
  switch (record.status) {
    case "fulfilled":
      return FAILURE_CODES.NONE;
    case "unavailable":
      return FAILURE_CODES.AGENT_UNAVAILABLE;
    case "timeout":
      return FAILURE_CODES.TIMEOUT;
    case "error":
      return FAILURE_CODES.AGENT_ERROR;
    default:
      return FAILURE_CODES.UNKNOWN;
  }
}

/** True for any non-success classification, including AGENT_UNAVAILABLE (never executed, still a gap in coverage). */
function isFailure(record) {
  return classify(record) !== FAILURE_CODES.NONE;
}

module.exports = { FAILURE_CODES, classify, isFailure };
