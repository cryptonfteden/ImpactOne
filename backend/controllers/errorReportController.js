const errorReportService = require("../services/errorReportService");

function handleKnownError(error, res, next) {
  if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
  return next(error);
}

async function reportError(req, res, next) {
  try {
    const { source, message, stack, screen, action, apiInvolved, correlationId } = req.body || {};
    const created = await errorReportService.reportError({
      source, message, stack, screen, action, apiInvolved, correlationId, betaUserId: req.betaUserId,
    });
    res.status(201).json({ id: created.id });
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function listErrorReports(req, res, next) {
  try {
    res.json({ errors: await errorReportService.listErrorReports() });
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

module.exports = { reportError, listErrorReports };
