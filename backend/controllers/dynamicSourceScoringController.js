const dynamicSourceScoringService = require("../services/dynamicSourceScoringService");

async function getDynamicCredibility(req, res, next) {
  try {
    res.json(await dynamicSourceScoringService.getDynamicCredibility(req.params.sourceName));
  } catch (error) {
    next(error);
  }
}

async function getSnapshotHistory(req, res, next) {
  try {
    res.json(await dynamicSourceScoringService.getSnapshotHistory(req.params.sourceName));
  } catch (error) {
    next(error);
  }
}

module.exports = { getDynamicCredibility, getSnapshotHistory };
