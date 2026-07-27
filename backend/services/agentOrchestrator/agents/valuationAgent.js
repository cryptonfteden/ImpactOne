const { createStubAgent } = require("./stubAgentFactory");

// Phase AGENT-ORCHESTRATOR-001 — registration prepared, not yet real.
// No valuation service (DCF, multiples, fair-value) exists anywhere in
// this codebase yet.
module.exports = createStubAgent({ id: "valuation", name: "Valuation Agent", category: "VALUATION", priority: 7 });
