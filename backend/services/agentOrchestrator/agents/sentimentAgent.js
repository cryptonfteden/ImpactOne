// Phase AGENT-ORCHESTRATOR-001 — a real agent, not a stub. All of the
// actual sentiment scoring lives in marketSentimentService.js (already
// real, already tested) — this file only adapts its existing output
// into the generic Agent interface.
//
// Honesty note: marketSentimentService.getMarketSentiment(market) is
// market-wide (its parameter is a market like "US", not a stock
// symbol) — there is no per-symbol sentiment engine in this codebase
// yet. This agent's `execute(symbol)` deliberately ignores the symbol
// and reports the real market-wide reading, disclosed as such in its
// own summary text, rather than pretending it's symbol-specific.
const marketSentimentService = require("../../marketSentiment/marketSentimentService");

const DEFAULT_MARKET = "US";

async function execute() {
  const reading = await marketSentimentService.getMarketSentiment(DEFAULT_MARKET);
  const sources = reading.provenance?.sources || [];
  const blockers = [
    ...(reading.dataFreshness?.isStale ? [reading.dataFreshness.reason || "Market inputs are stale."] : []),
    ...(sources.length < 2 ? [`Only ${sources.length} market-sentiment source(s) were available.`] : []),
    ...((Number(reading.confidence) || 0) < 50 ? [`Market-sentiment confidence is ${Number(reading.confidence) || 0}/100.`] : []),
  ];
  const dataQuality = {
    sourceCount: sources.length,
    sources,
    stale: Boolean(reading.dataFreshness?.isStale),
    missingInputs: reading.missingInputs || [],
    blockers,
    signalEligible: blockers.length === 0,
  };
  // reading.trend is a structured { daily: { direction, ... }, weekly: { direction, ... } }
  // object, not a simple string — the daily direction is the one real,
  // simple string this generic Agent interface's `direction` field
  // requires (used only for opaque equality comparison, never
  // interpreted by the orchestrator).
  return {
    summary: `Market-wide (${reading.market}) sentiment — score ${reading.score}/100 (this is a market-wide reading, not symbol-specific).`,
    direction: dataQuality.signalEligible ? reading.trend?.daily?.direction || null : null,
    evidence: [
      ...(reading.contributors || []).map((contributor) => ({ observedFact: `${contributor.dimension}: score ${contributor.score}, confidence ${contributor.confidence}` })),
      { observedFact: `Market tone uses ${sources.length} identified source(s); freshness ${dataQuality.stale ? "stale" : "current"}.` },
    ],
    raw: { ...reading, signalEligible: dataQuality.signalEligible, dataQuality },
  };
}

function confidence(result) {
  return Number.isFinite(result?.raw?.confidence) ? result.raw.confidence : 0;
}

async function health() {
  return { status: "healthy", reason: null };
}

module.exports = {
  metadata: { id: "sentiment", name: "Market Sentiment Agent", category: "SENTIMENT", priority: 6 },
  execute,
  confidence,
  health,
};
