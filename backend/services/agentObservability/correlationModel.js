// Phase AGENT-OBSERVABILITY-001 — identity generation only. This module
// has no business logic and no knowledge of agents, symbols, or
// execution outcomes: it exists purely so every other file in this
// layer shares one place to get a "new unique id" from, instead of each
// inventing its own scheme.
//
// Two distinct id kinds, never confused with each other:
//   - correlationId: identifies one orchestrator.run() call (one symbol
//     lookup, N agents running in parallel underneath it).
//   - executionId: identifies exactly one agent's single execution
//     within that run (one agent, one attempt-sequence, one record).
const crypto = require("node:crypto");

function newCorrelationId() {
  return `corr_${crypto.randomUUID()}`;
}

function newExecutionId() {
  return `exec_${crypto.randomUUID()}`;
}

module.exports = { newCorrelationId, newExecutionId };
