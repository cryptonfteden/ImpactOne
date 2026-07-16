const outcomeIntelligenceService = require("../services/outcomeIntelligenceService");

async function listLessons(req, res, next) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const lessons = await outcomeIntelligenceService.listRecentLessons({ limit });
    res.json({ lessons });
  } catch (error) {
    next(error);
  }
}

module.exports = { listLessons };
