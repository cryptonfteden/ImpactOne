const { analyzeTicker } = require("../services/openaiService");

async function analyze(req, res, next) {
  try {
    const symbol = req.query.symbol || req.body?.symbol || "NVDA";
    const context = req.body?.context || {
      quote: req.body?.quote || null,
      company: req.body?.company || null,
      recommendation: req.body?.recommendation || null,
      recommendationTrend: req.body?.recommendationTrend || null,
      news: req.body?.news || [],
      metrics: req.body?.metrics || null,
    };

    console.log(`[ai-controller] request method=${req.method} symbol=${symbol}`);
    console.log(`[ai-controller] request body=${JSON.stringify(req.body || {}).slice(0, 2000)}`);

    const analysis = await analyzeTicker(symbol, context);
    console.log(`[ai-controller] response analysis=${JSON.stringify(analysis).slice(0, 4000)}`);
    res.json({ symbol, analysis });
  } catch (error) {
    console.error("[ai-controller] failure", error);
    next(error);
  }
}

module.exports = { analyze };
