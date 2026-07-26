const decisionTimelineService = require("../services/decisionTimelineService");

function handleKnownError(error, res, next) {
  if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
  return next(error);
}

async function getDecisionTimeline(req, res, next) {
  try {
    res.json(await decisionTimelineService.getDecisionTimeline(req.betaUserId));
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

module.exports = { getDecisionTimeline };
