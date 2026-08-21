const service = require("../services/dailyAgentPicksService");

async function listDailyAgentPicks(req, res, next) {
  try {
    res.json(await service.getDailyAgentPicks({ force: req.query.refresh === "true" }));
  } catch (error) { next(error); }
}

module.exports = { listDailyAgentPicks };
