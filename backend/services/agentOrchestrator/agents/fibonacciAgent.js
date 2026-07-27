const { createStubAgent } = require("./stubAgentFactory");

// Phase AGENT-ORCHESTRATOR-001 — registration prepared, not yet real.
// Fibonacci retracement analysis exists today only as an internal,
// non-exported helper inside technicalIntelligenceService.js
// (analyzeFibonacci), not a standalone callable analysis with its own
// confidence — an honest "unavailable" registration rather than
// reaching into another agent's internals.
module.exports = createStubAgent({ id: "fibonacci", name: "Fibonacci Agent", category: "TECHNICAL", priority: 4 });
