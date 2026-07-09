const { analyzeTicker } = require("../services/openaiService");

async function analyze(req, res, next) {
  try {
    const symbol = req.query.symbol || "NVDA";
    const analysis = await analyzeTicker(symbol);
    res.json({ symbol, analysis });
  } catch (error) {
    next(error);
  }
}

module.exports = { analyze };
