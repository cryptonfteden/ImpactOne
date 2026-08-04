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

// Phase PLATFORM-HARDENING-001 — "Correlation ID propagation
// end-to-end": if an inbound HTTP request already carries a
// correlation id (e.g. from an upstream gateway, or a client re-trying
// a request it already tagged), every controller in this layer should
// honor it rather than mint a competing one — one shared helper so this
// header name/parsing rule lives in exactly one place.
const CORRELATION_HEADER = "x-correlation-id";

function resolveRequestCorrelationId(req) {
  const header = req?.headers?.[CORRELATION_HEADER];
  const value = Array.isArray(header) ? header[0] : header;
  if (typeof value === "string" && value.trim()) return value.trim();
  return newCorrelationId();
}

module.exports = { newCorrelationId, newExecutionId, resolveRequestCorrelationId, CORRELATION_HEADER };
