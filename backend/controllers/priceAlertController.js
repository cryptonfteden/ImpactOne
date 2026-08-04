const priceAlertService = require("../services/priceAlertService");

function handleKnownError(error, res, next) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  return next(error);
}

async function listAlerts(req, res, next) {
  try {
    const alerts = await priceAlertService.listAlerts(req.betaUserId);
    res.json({ alerts });
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function createAlert(req, res, next) {
  try {
    const { symbol, direction, targetPrice } = req.body || {};
    const alert = await priceAlertService.createAlert(req.betaUserId, { symbol, direction, targetPrice });
    res.status(201).json(alert);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function deactivateAlert(req, res, next) {
  try {
    const alert = await priceAlertService.deactivateAlert(req.betaUserId, req.params.id);
    res.json(alert);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function deleteAlert(req, res, next) {
  try {
    await priceAlertService.deleteAlert(req.betaUserId, req.params.id);
    res.status(204).end();
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

// Manual/on-demand trigger check — the same function the background
// scheduler calls (see alertScheduler.js). Exposed so triggering behavior
// can be verified deterministically (tests, live verification) without
// waiting for the real cadence.
async function checkAlerts(req, res, next) {
  try {
    const triggered = await priceAlertService.checkAndTriggerAlerts();
    res.json({ triggered });
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

module.exports = { listAlerts, createAlert, deactivateAlert, deleteAlert, checkAlerts };
