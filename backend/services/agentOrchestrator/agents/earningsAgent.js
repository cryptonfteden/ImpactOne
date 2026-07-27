const { createStubAgent } = require("./stubAgentFactory");

// Phase AGENT-ORCHESTRATOR-001 — registration prepared, not yet real.
// An earningsProvider exists (raw data fetch only) but no analysis/
// scoring service sits on top of it yet — an honest "unavailable"
// registration rather than a shallow, uninterpreted data dump presented
// as analysis.
module.exports = createStubAgent({ id: "earnings", name: "Earnings Agent", category: "EARNINGS", priority: 7 });
