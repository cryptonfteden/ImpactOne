const { analyzeTicker } = require("../services/openaiService");
const { analyzeMarketImpact } = require("../services/marketImpactService");
const { getAltDataSummary } = require("../services/altDataService");
// Sprint 41 — Committee Unification: the ONE canonical committee, replacing
// the retired investmentCommitteeService.js.
const intelligenceCommitteeService = require("../services/intelligenceCommittee/intelligenceCommitteeService");
const { analyzeIntelligence } = require("../services/impactIntelligenceService");

async function analyze(req, res, next) {
  try {
    const symbol = req.query.symbol || req.body?.symbol || "NVDA";
    const context = req.body?.context || {
      quote: req.body?.quote || null,
      company: req.body?.company || null,
      recommendation: req.body?.recommendation || null,
      recommendationTrend: req.body?.recommendationTrend || null,
      news: req.body?.news || [],
      chart: req.body?.chart || [],
      fearGreed: req.body?.fearGreed || null,
      metrics: req.body?.metrics || null,
    };

    const eventHint = context.news?.[0]?.headline || `${symbol} earnings`;
    const [altDataSummary, analysis, marketImpact, intelligenceReport] = await Promise.all([
      getAltDataSummary({ symbol }).catch(() => null),
      analyzeTicker(symbol, context),
      analyzeMarketImpact(symbol, context),
      analyzeIntelligence({ event: eventHint, symbol }).catch(() => null),
    ]);
    // Sprint 41 — Committee Unification: convenes the ONE canonical
    // committee (evidence-matrix-driven, Sprint 38) for this symbol.
    // Replaces the retired investmentCommitteeService.js call — same gate
    // (never blocks the rest of the analysis on failure), new shape.
    const committeeResult = await intelligenceCommitteeService.convene(symbol).catch(() => null);
    res.json({
      symbol,
      analysis: {
        ...analysis,
        marketImpact,
        alternativeDataSignals: altDataSummary?.signals || null,
        // Sprint 41 — the unified committee's coordinator summary and CIO
        // summary, exactly as produced by intelligenceCommitteeService —
        // never a second verdict (both carry isVerdict: false).
        committee: committeeResult?.committee || null,
        cio: committeeResult?.cio || null,
      },
    });
  } catch (error) {
    console.error("[ai-controller] failure", error);
    next(error);
  }
}

module.exports = { analyze };
