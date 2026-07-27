const { createStubAgent } = require("./stubAgentFactory");

// Phase AGENT-ORCHESTRATOR-001 — registration prepared, not yet real.
// Same situation as Institutional: macro analysis exists today only as
// a committee member (macroEconomistMember.js) over a shared evidence
// matrix, not a standalone, per-symbol-callable agent.
module.exports = createStubAgent({ id: "macro", name: "Macro Agent", category: "MACRO", priority: 5 });
