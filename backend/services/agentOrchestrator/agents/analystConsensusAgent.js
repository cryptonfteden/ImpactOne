const { createStubAgent } = require("./stubAgentFactory");

// Phase AGENT-ORCHESTRATOR-001 — registration prepared, not yet real.
// analystConsensusService.js exists but as normalization/fixture-only
// helpers (normalizeRating, crossCheckRatings, getFixtureConsensus) —
// no live per-symbol fetch entrypoint was found, so a real agent here
// would either wrap fixture data (dishonest — would look live) or
// require new provider wiring outside this phase's scope.
module.exports = createStubAgent({ id: "analyst-consensus", name: "Analyst Consensus Agent", category: "ANALYST_CONSENSUS", priority: 6 });
