// Phase AGENT-ORCHESTRATOR-001 — registration prepared, not yet real.
// newsService.getNews(query) exists but is query-scoped, not
// symbol-scoped analysis with a confidence/direction — wiring it in
// honestly requires a real per-symbol relevance/analysis layer this
// codebase doesn't have yet (see AGENT_ORCHESTRATOR.md).
// Phase NEWS-AGENT-001 — upgraded to a real Domain Intelligence Agent
// (backend/services/domainAgents/newsAgent/): reuses
// SENTIMENT-AGENT-001's own real NewsAPI provider, source-quality
// analyzer, and article-sentiment scorer (per "reuse existing news
// infrastructure wherever possible") to compute News Bias, News Score,
// Importance Score, Freshness Score, Confirmation Score, Impact
// Horizon, Affected Sectors, Bullish/Bearish Factors, Risks,
// Confidence, and a deterministic (not an LLM call) AI Summary. Honestly
// reports unavailable whenever no verified real news exists (e.g. no
// NEWS_API_KEY configured) — never fabricated. This file still only
// adapts that engine's already-real report into the generic Agent
// interface; it invents no analysis of its own, the same discipline
// every other real agent here follows.
const newsAgentEngine = require("../../domainAgents/newsAgent/newsAgent");

async function execute(symbol) {
  const report = await newsAgentEngine.generateReport(symbol);

  if (!report.dataAvailable) {
    return {
      summary: report.aiSummary,
      direction: null,
      evidence: [],
      raw: report,
    };
  }

  return {
    summary: report.aiSummary,
    // The orchestrator only compares this string for equality with other
    // agents' directions (structural conflict detection) — it never
    // interprets it. NEUTRAL news bias reports no opinion.
    direction: report.signalEligible === false || report.newsBias === "NEUTRAL" ? null : report.newsBias,
    evidence: [
      { observedFact: `Source: ${report.dataQuality.source}; ${report.dataQuality.companyRelevantCount}/${report.dataQuality.fetchedArticleCount} articles were company-relevant across ${report.dataQuality.uniqueCompanySources} sources.` },
      { observedFact: `News Bias: ${report.newsBias} (News Score ${report.newsScore}), Importance ${report.importanceScore}/100, Impact Horizon ${report.impactHorizon}.` },
      { observedFact: `Freshness ${report.freshnessScore}/100, Confirmation ${report.confirmationScore}/100.` },
    ],
    raw: report,
  };
}

function confidence(result) {
  return Number.isFinite(result?.raw?.confidence) ? result.raw.confidence : 0;
}

async function health() {
  return { status: "healthy", reason: null };
}

module.exports = {
  metadata: { id: "news", name: "News Intelligence Agent", category: "NEWS", priority: 7 },
  execute,
  confidence,
  health,
};
