const insiderOpportunityService = require("../services/insiderOpportunityService");

async function listInsiderOpportunities(req, res, next) {
  try {
    const symbols = String(req.query.symbols || "").split(",").map((item) => item.trim()).filter(Boolean);
    const payload = await insiderOpportunityService.runDailyScan({
      symbols: symbols.length ? symbols : undefined,
      force: req.query.refresh === "true",
    });
    res.json(payload);
  } catch (error) {
    next(error);
  }
}

module.exports = { listInsiderOpportunities };
