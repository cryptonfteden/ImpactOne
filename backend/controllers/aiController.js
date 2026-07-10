const { analyzeTicker } = require("../services/openaiService");
const { analyzeMarketImpact } = require("../services/marketImpactService");
const { getAltDataSummary } = require("../services/altDataService");
const { analyzeInvestmentCommittee } = require("../services/investmentCommitteeService");
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

    console.log(`[ai-controller] request method=${req.method} symbol=${symbol}`);
    console.log(`[ai-controller] request body=${JSON.stringify(req.body || {}).slice(0, 2000)}`);

    const eventHint = context.news?.[0]?.headline || `${symbol} earnings`;
    const [altDataSummary, analysis, marketImpact, intelligenceReport] = await Promise.all([
      getAltDataSummary({ symbol }).catch(() => null),
      analyzeTicker(symbol, context),
      analyzeMarketImpact(symbol, context),
      analyzeIntelligence({ event: eventHint, symbol }).catch(() => null),
    ]);
    const committeeReport = await analyzeInvestmentCommittee({
      symbol,
      context,
      intelligenceReport,
      altDataSummary,
      marketImpact,
    }).catch(() => null);
    console.log(`[ai-controller] response analysis=${JSON.stringify(analysis).slice(0, 4000)}`);
    console.log(`[ai-controller] response marketImpact=${JSON.stringify(marketImpact).slice(0, 4000)}`);
    res.json({
      symbol,
      analysis: {
        ...analysis,
        marketImpact,
        alternativeDataSignals: altDataSummary?.signals || null,
        committee: committeeReport?.committee || null,
        committeeTrackRecord: committeeReport?.trackRecord?.stats || null,
      },
    });
  } catch (error) {
    console.error("[ai-controller] failure", error);
    next(error);
  }
}

module.exports = { analyze };
