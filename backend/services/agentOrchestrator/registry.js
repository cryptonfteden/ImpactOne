// Phase AGENT-ORCHESTRATOR-001 — the one place every agent is
// registered. Three real agents today (Technical, Options, Sentiment),
// each adapting an already-real, already-tested service; ten prepared,
// honestly-inert stub registrations for the remaining named domains
// (News, Short Interest, Earnings, Valuation, Fibonacci, Insider, ETF
// Flow, Institutional, Macro, Analyst Consensus) — see each stub file's
// own comment for exactly why it isn't real yet.
const { registerAgent, getRegisteredAgents } = require("./agentOrchestrator");

const technicalAgent = require("./agents/technicalAgent");
const optionsAgent = require("./agents/optionsAgent");
const sentimentAgent = require("./agents/sentimentAgent");
const newsAgent = require("./agents/newsAgent");
const shortInterestAgent = require("./agents/shortInterestAgent");
const earningsAgent = require("./agents/earningsAgent");
const valuationAgent = require("./agents/valuationAgent");
const fibonacciAgent = require("./agents/fibonacciAgent");
const insiderAgent = require("./agents/insiderAgent");
const etfFlowAgent = require("./agents/etfFlowAgent");
const institutionalAgent = require("./agents/institutionalAgent");
const macroAgent = require("./agents/macroAgent");
const analystConsensusAgent = require("./agents/analystConsensusAgent");

const ALL_AGENTS = [
  technicalAgent,
  optionsAgent,
  sentimentAgent,
  newsAgent,
  shortInterestAgent,
  earningsAgent,
  valuationAgent,
  fibonacciAgent,
  insiderAgent,
  etfFlowAgent,
  institutionalAgent,
  macroAgent,
  analystConsensusAgent,
];

/**
 * Idempotent by design against the orchestrator's ACTUAL current
 * registry state (never a separate, possibly-stale local flag) — safe
 * to call from app startup, and safe to call again in a test after
 * `agentOrchestrator.clearRegistry()`, which must always result in a
 * real, fresh re-registration rather than a silent no-op.
 */
function registerAllAgents() {
  const alreadyRegisteredIds = new Set(getRegisteredAgents().map((agent) => agent.metadata.id));
  for (const agent of ALL_AGENTS) {
    if (!alreadyRegisteredIds.has(agent.metadata.id)) {
      registerAgent(agent);
    }
  }
}

module.exports = { registerAllAgents, ALL_AGENTS };
