// Phase AI-ENGINE-003 — Platform Intelligence Bus. Registries for the
// two closed vocabularies the Bus governs: publishing engines and
// consumers. Both are named explicitly here (not inferred/guessed at
// publish time) so a typo'd engine/consumer id fails loudly rather than
// silently creating a new, uncoordinated category.

// The 8 named engines from the mission, plus the explicit "future
// engines" extension point. A string, not a hard enum at the DB layer
// (IntelligenceBusEvent.engineId is a String column) — adding a 9th real
// engine never requires a migration, same precedent as
// CanonicalEvent.providerId. This registry is the soft, in-application
// validation layer instead.
const KNOWN_ENGINES = {
  options: { label: "Unusual Options Agent", staleAfterMs: 15 * 60 * 1000 }, // intraday-cadence per OPTIONS_AGENT_ARCHITECTURE.md §9
  sentiment: { label: "Market Sentiment Engine", staleAfterMs: 24 * 60 * 60 * 1000 }, // daily-cadence per MARKET_SENTIMENT_ENGINE.md §12
  macro: { label: "Macro Events Engine", staleAfterMs: 24 * 60 * 60 * 1000 },
  earnings: { label: "Earnings Trend Engine", staleAfterMs: 24 * 60 * 60 * 1000 },
  ownership: { label: "Ownership Engine", staleAfterMs: 7 * 24 * 60 * 60 * 1000 }, // institutional ownership changes quarterly/monthly, not daily
  shortInterest: { label: "Short Interest Engine", staleAfterMs: 14 * 24 * 60 * 60 * 1000 }, // FINRA short-interest data is real but only published twice monthly
  correlation: { label: "Correlation Engine", staleAfterMs: 24 * 60 * 60 * 1000 },
  news: { label: "News Engine", staleAfterMs: 60 * 60 * 1000 }, // wire news is time-sensitive
  // Phase CLAIM-INTELLIGENCE-INTEGRATION-001 — additive entries only
  // (nothing above this line is renamed or removed) so every one of the
  // 14 real Domain Intelligence Agents (agentOrchestrator/registry.js's
  // ALL_AGENTS) can publish through the Bus under its own real
  // `metadata.id`. Kept in the agents' own kebab-case (not remapped onto
  // the pre-existing camelCase entries above, which stay exactly as they
  // were for their own, unrelated callers) — a deliberate, additive
  // extension of a soft registry, not a redesign of it.
  technical: { label: "Technical Intelligence Agent", staleAfterMs: 4 * 60 * 60 * 1000 }, // intraday indicator reads
  "symbol-sentiment": { label: "Sentiment Intelligence Agent", staleAfterMs: 24 * 60 * 60 * 1000 }, // real per-symbol news sentiment, daily-cadence like the market-wide entry above
  "short-interest": { label: "Short Interest Intelligence Agent", staleAfterMs: 24 * 60 * 60 * 1000 }, // this agent's own real FINRA daily short-volume proxy, refreshed daily (distinct from the bi-monthly `shortInterest` entry above)
  valuation: { label: "Valuation Intelligence Agent", staleAfterMs: 24 * 60 * 60 * 1000 },
  fibonacci: { label: "Fibonacci Intelligence Agent", staleAfterMs: 24 * 60 * 60 * 1000 },
  insider: { label: "Insider Intelligence Agent", staleAfterMs: 7 * 24 * 60 * 60 * 1000 }, // real SEC Form 4 filings lag and arrive irregularly
  "etf-flow": { label: "ETF Flow Intelligence Agent", staleAfterMs: 24 * 60 * 60 * 1000 },
  institutional: { label: "Institutional Intelligence Agent", staleAfterMs: 7 * 24 * 60 * 60 * 1000 }, // real SEC 13F-HR filings are quarterly
  "analyst-consensus": { label: "Analyst Consensus Intelligence Agent", staleAfterMs: 24 * 60 * 60 * 1000 },
};

const DEFAULT_STALE_AFTER_MS = 24 * 60 * 60 * 1000; // used for any future engine not yet named above

// Every consumer the mission names explicitly. Consumers subscribe by
// name so the Bus can log/report "who reads what" honestly — this list
// is documentation-as-code, cross-checked by
// intelligenceSubscriptionModel tests, not a runtime access-control gate
// (any string is technically accepted by subscribe(), same "soft
// registry, not a hard wall" posture as KNOWN_ENGINES — see
// INTELLIGENCE_SUBSCRIPTION_MODEL.md for why).
const KNOWN_CONSUMERS = ["MissionControl", "IntelligenceWorkspace", "PortfolioWorkspace", "StockWorkspace", "Alerts", "Watchlists", "AiChat", "Mobile"];

function isKnownEngine(engineId) {
  return Object.prototype.hasOwnProperty.call(KNOWN_ENGINES, engineId);
}

function staleAfterMsForEngine(engineId) {
  return KNOWN_ENGINES[engineId]?.staleAfterMs ?? DEFAULT_STALE_AFTER_MS;
}

module.exports = {
  KNOWN_ENGINES,
  KNOWN_CONSUMERS,
  DEFAULT_STALE_AFTER_MS,
  isKnownEngine,
  staleAfterMsForEngine,
};
