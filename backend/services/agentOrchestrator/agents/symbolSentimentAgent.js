// Phase SENTIMENT-AGENT-001 — a real agent, not a stub. This is
// DISTINCT from the existing `"sentiment"` agent registered in this
// same directory (sentimentAgent.js), which wraps
// marketSentiment/marketSentimentService.js and is honestly market-wide
// (it ignores its symbol argument). This agent answers a genuinely
// different question — real, per-symbol news sentiment (state, trend,
// score, velocity, source quality, abnormal activity, sentiment-price
// divergence) — so it is registered under its own id rather than
// replacing or silently merging with the market-wide reading.
// All of the actual analysis lives in
// backend/services/domainAgents/sentimentAgent/ (already real, already
// tested) — this file only adapts its existing output into the generic
// Agent interface; it invents no new analysis.
const sentimentAgentEngine = require("../../domainAgents/sentimentAgent/sentimentAgent");

async function execute(symbol) {
  const report = await sentimentAgentEngine.generateReport(symbol);

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
    // interprets it. NEUTRAL sentiment state reports no opinion.
    direction: report.signalEligible === false || report.sentimentState === "NEUTRAL" ? null : report.sentimentState,
    evidence: [
      { observedFact: `Sentiment: ${report.sentimentState} (score ${report.sentimentScore}/100), trend ${report.sentimentTrend}.` },
      { observedFact: `Based on ${report.sourceQuality.totalArticleCount} real article(s) from ${report.sourceQuality.distinctSourceCount} distinct source(s).` },
      ...(report.divergence.divergence !== "NONE" ? [{ observedFact: `Sentiment-price divergence detected: ${report.divergence.divergence}.` }] : []),
      ...(report.abnormalActivity.hasAbnormalActivity ? [{ observedFact: "Abnormal sentiment/volume activity detected in this window." }] : []),
      { observedFact: `Sentiment evidence: ${report.dataQuality.articleCount} articles from ${report.dataQuality.distinctSourceCount} sources; ${report.dataQuality.tier1ArticleCount} tier-1 article(s).` },
      ...(report.dataQuality.queryIdentity ? [{ observedFact: `News search identity verified as "${report.dataQuality.queryIdentity}"; ticker-only ambiguity was not used.` }] : []),
    ],
    raw: report,
  };
}

function confidence(result) {
  const score = result?.raw?.confidence?.confidence;
  return Number.isFinite(score) ? score : 0;
}

async function health() {
  return { status: "healthy", reason: null };
}

module.exports = {
  metadata: { id: "symbol-sentiment", name: "Sentiment Intelligence Agent", category: "SENTIMENT", priority: 5 },
  execute,
  confidence,
  health,
};
