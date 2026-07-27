// Phase AGENT-ORCHESTRATOR-001 — the one generic Agent contract every
// current and future agent must implement. This file defines and
// validates the shape only — it contains zero analysis logic of its
// own, and never will (that would make it the exact kind of "the
// orchestrator knows business logic" violation this phase's mission
// explicitly forbids).
//
// An Agent is a plain object with exactly four members:
//   metadata: { id, name, category, priority }
//     - id: a stable, unique string (the registry key)
//     - name: a human-readable label
//     - category: a free-text grouping (e.g. "TECHNICAL", "SENTIMENT") —
//       informational only, the orchestrator never branches on it
//     - priority: a positive finite number; higher means more influence
//       on the orchestrator's weighted overall-confidence calculation
//       and rank tie-breaks — it is NOT an execution order (every agent
//       still runs in parallel regardless of priority)
//   async execute(symbol) -> { summary, direction, evidence, raw }
//     - the agent's own real analysis; the orchestrator never inspects
//       or interprets the content, only whether the call
//       resolved/rejected/timed out
//     - `direction` is a free-text, agent-defined string (e.g.
//       "BULLISH"/"BEARISH"/"NEUTRAL") used only for structural conflict
//       detection (do two agents disagree), never interpreted
//     - `evidence` is an array of plain objects (shape is the agent's
//       own business), merged verbatim by the orchestrator
//   confidence(result) -> number (0-100)
//     - a pure function deriving a confidence score from the agent's own
//       execute() result — the orchestrator calls this itself after a
//       successful execute(), but never computes a confidence value on
//       an agent's behalf
//   async health() -> { status: "healthy" | "degraded" | "unavailable", reason }
//     - a fast, real check (e.g. "is my provider configured/reachable")
//       the orchestrator calls before execute(); an "unavailable" agent
//       is skipped without ever calling execute()

const REQUIRED_HEALTH_STATUSES = new Set(["healthy", "degraded", "unavailable"]);

function validateAgent(agent) {
  const errors = [];

  if (!agent || typeof agent !== "object") {
    return ["agent must be an object"];
  }

  if (!agent.metadata || typeof agent.metadata !== "object") {
    errors.push("agent.metadata is required");
  } else {
    if (!agent.metadata.id || typeof agent.metadata.id !== "string") errors.push("agent.metadata.id must be a non-empty string");
    if (!agent.metadata.name || typeof agent.metadata.name !== "string") errors.push("agent.metadata.name must be a non-empty string");
    if (!Number.isFinite(agent.metadata.priority) || agent.metadata.priority <= 0) errors.push("agent.metadata.priority must be a positive finite number");
  }

  if (typeof agent.execute !== "function") errors.push("agent.execute must be a function");
  if (typeof agent.confidence !== "function") errors.push("agent.confidence must be a function");
  if (typeof agent.health !== "function") errors.push("agent.health must be a function");

  return errors;
}

function assertValidAgent(agent) {
  const errors = validateAgent(agent);
  if (errors.length) {
    const id = agent?.metadata?.id || "unknown";
    throw new Error(`Invalid agent "${id}": ${errors.join("; ")}`);
  }
}

function isValidHealthResult(healthResult) {
  return Boolean(healthResult) && typeof healthResult === "object" && REQUIRED_HEALTH_STATUSES.has(healthResult.status);
}

module.exports = { validateAgent, assertValidAgent, REQUIRED_HEALTH_STATUSES, isValidHealthResult };
