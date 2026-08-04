const homeSummaryService = require("../services/homeSummaryService");

async function getHomeSummary(req, res, next) {
  try {
    const watchlist = req.query.watchlist ? String(req.query.watchlist).split(",") : [];
    const summary = await homeSummaryService.buildHomeSummary({ watchlist, betaUserId: req.betaUserId });
    res.json(summary);
  } catch (error) {
    next(error);
  }
}

module.exports = { getHomeSummary };
