const service = require("../services/weeklyFibonacciOpportunityService");

async function listWeeklyFibonacciOpportunities(req, res, next) {
  try {
    const symbols = String(req.query.symbols || "").split(",").map((item) => item.trim()).filter(Boolean);
    res.json(await service.runScan({ symbols: symbols.length ? symbols : undefined, force: req.query.refresh === "true" }));
  } catch (error) { next(error); }
}

module.exports = { listWeeklyFibonacciOpportunities };
