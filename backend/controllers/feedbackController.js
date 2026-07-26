const feedbackService = require("../services/feedbackService");

function handleKnownError(error, res, next) {
  if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
  return next(error);
}

async function submitFeedback(req, res, next) {
  try {
    const { type, message, screen, browser, appVersion } = req.body || {};
    const created = await feedbackService.submitFeedback({ type, message, screen, browser, appVersion, betaUserId: req.betaUserId });
    res.status(201).json(created);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function listFeedback(req, res, next) {
  try {
    res.json({ feedback: await feedbackService.listFeedback() });
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

module.exports = { submitFeedback, listFeedback };
