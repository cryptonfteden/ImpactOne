const { createStubAgent } = require("./stubAgentFactory");

// Phase AGENT-ORCHESTRATOR-001 — registration prepared, not yet real.
// Only a static sector-to-ETF lookup table exists (sectorEtfMap.js) — no
// real ETF fund-flow data provider or analysis service.
module.exports = createStubAgent({ id: "etf-flow", name: "ETF Flow Agent", category: "ETF_FLOW", priority: 4 });
