const decisionCenterService = require("../services/decisionCenterService");

function handleKnownError(error, res, next) {
  if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
  return next(error);
}

async function getDecisions(req, res, next) {
  try {
    const result = await decisionCenterService.getDecisions(req.betaUserId, {
      source: req.query.source || undefined,
      priority: req.query.priority || undefined,
      sortBy: req.query.sortBy || undefined,
      includeDismissed: req.query.includeDismissed === "true",
    });
    res.json(result);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function pin(req, res, next) {
  try {
    await decisionCenterService.setDecisionStatus(req.betaUserId, req.params.id, "PINNED");
    res.status(204).end();
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function dismiss(req, res, next) {
  try {
    await decisionCenterService.setDecisionStatus(req.betaUserId, req.params.id, "DISMISSED");
    res.status(204).end();
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function complete(req, res, next) {
  try {
    await decisionCenterService.setDecisionStatus(req.betaUserId, req.params.id, "COMPLETED");
    res.status(204).end();
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function clearStatus(req, res, next) {
  try {
    await decisionCenterService.clearDecisionStatus(req.betaUserId, req.params.id);
    res.status(204).end();
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

module.exports = { getDecisions, pin, dismiss, complete, clearStatus };
