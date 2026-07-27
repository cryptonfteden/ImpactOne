const { createStubAgent } = require("./stubAgentFactory");

// Phase AGENT-ORCHESTRATOR-001 — registration prepared, not yet real.
// No short-interest provider or service exists anywhere in this
// codebase yet (confirmed by a full-repo search) — an honest
// "unavailable" registration, never a fabricated short-interest score.
module.exports = createStubAgent({ id: "short-interest", name: "Short Interest Agent", category: "SHORT_INTEREST", priority: 5 });
