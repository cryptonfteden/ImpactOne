const { createStubAgent } = require("./stubAgentFactory");

// Phase AGENT-ORCHESTRATOR-001 — registration prepared, not yet real.
// Institutional-ownership analysis exists today only as a committee
// member (institutionalSpecialistMember.js) reading one row of a
// shared, pre-built evidence matrix — not an independently callable,
// per-symbol agent with its own real data fetch. An honest
// "unavailable" registration rather than reaching into the committee's
// internals.
module.exports = createStubAgent({ id: "institutional", name: "Institutional Agent", category: "INSTITUTIONAL", priority: 6 });
