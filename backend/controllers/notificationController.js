const notificationService = require("../services/notificationService");

function handleKnownError(error, res, next) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  return next(error);
}

async function listNotifications(req, res, next) {
  try {
    const result = await notificationService.listNotifications(req.betaUserId, { groupBy: req.query.groupBy || undefined });
    res.json(result);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function markRead(req, res, next) {
  try {
    const notification = await notificationService.markRead(req.betaUserId, req.params.id);
    res.json(notification);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function pin(req, res, next) {
  try {
    const notification = await notificationService.setPinned(req.betaUserId, req.params.id, true);
    res.json(notification);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function unpin(req, res, next) {
  try {
    const notification = await notificationService.setPinned(req.betaUserId, req.params.id, false);
    res.json(notification);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function clearNotification(req, res, next) {
  try {
    await notificationService.clearNotification(req.betaUserId, req.params.id);
    res.status(204).end();
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

module.exports = { listNotifications, markRead, pin, unpin, clearNotification };
