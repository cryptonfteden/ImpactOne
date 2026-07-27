const { createStubAgent } = require("./stubAgentFactory");

// Phase AGENT-ORCHESTRATOR-001 — registration prepared, not yet real.
// newsService.getNews(query) exists but is query-scoped, not
// symbol-scoped analysis with a confidence/direction — wiring it in
// honestly requires a real per-symbol relevance/analysis layer this
// codebase doesn't have yet (see AGENT_ORCHESTRATOR.md).
module.exports = createStubAgent({ id: "news", name: "News Agent", category: "NEWS", priority: 6 });
