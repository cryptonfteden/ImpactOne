const analyticsService = require("../services/analyticsService");

async function recordEvent(req, res) {
  try {
    const { eventName, properties } = req.body || {};
    await analyticsService.recordEvent({ eventName, properties });
    res.status(204).end();
  } catch (error) {
    // Sprint 35 — telemetry must never be able to break or even be
    // noticeable to the product experience: an invalid/unknown event
    // name still returns 204 (the frontend's trackEvent() is
    // fire-and-forget and ignores the response either way), it just
    // isn't persisted. Only log server-side for visibility.
    console.error("analytics event record failed", error.message);
    res.status(204).end();
  }
}

module.exports = { recordEvent };
