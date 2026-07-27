const { createStubAgent } = require("./stubAgentFactory");

// Phase AGENT-ORCHESTRATOR-001 — registration prepared, not yet real.
// No insider-trading (Form 4 or equivalent) provider or service exists
// anywhere in this codebase yet.
module.exports = createStubAgent({ id: "insider", name: "Insider Agent", category: "INSIDER", priority: 6 });
