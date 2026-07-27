// Phase AGENT-ORCHESTRATOR-001 — the one shared implementation behind
// every not-yet-built agent registration. "Prepare registration for
// future agents" does not mean fabricating analysis for domains this
// codebase has no real service for yet (News, Short Interest, Earnings,
// Valuation, Fibonacci-as-its-own-agent, Insider, ETF Flow,
// Institutional, Macro, Analyst Consensus) — it means the registry slot
// exists, is interface-valid, and is honestly inert until a real agent
// replaces it. `health()` always reports "unavailable" so the
// orchestrator skips execute() entirely for a stub — never a wasted
// call, never fabricated output.
function createStubAgent({ id, name, category, priority = 5 }) {
  return {
    metadata: { id, name, category, priority },
    async execute() {
      const error = new Error(`${name} is not yet implemented.`);
      error.notImplemented = true;
      throw error;
    },
    confidence() {
      return 0;
    },
    async health() {
      return { status: "unavailable", reason: `${name} is not yet implemented.` };
    },
  };
}

module.exports = { createStubAgent };
