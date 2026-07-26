// Phase X9 — Part 2, Feedback System. Real, persisted, never aggregated
// at write time — see feedbackAdminService.js (Part 5) for the real
// count/breakdown consumed by the Admin Dashboard.
const feedbackRepository = require("./feedbackRepository");

const VALID_TYPES = ["BUG", "SUGGESTION", "QUESTION", "PRAISE"];

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

async function submitFeedback({ type, message, screen, browser, appVersion, betaUserId }) {
  if (!VALID_TYPES.includes(type)) {
    throw badRequest(`type must be one of ${VALID_TYPES.join(", ")}.`);
  }
  const trimmed = String(message || "").trim();
  if (!trimmed) {
    throw badRequest("A real feedback message is required.");
  }
  return feedbackRepository.createFeedback({
    type,
    message: trimmed,
    screen: screen || null,
    browser: browser || null,
    appVersion: appVersion || null,
    betaUserId: betaUserId || null,
  });
}

async function listFeedback({ limit = 200 } = {}) {
  return feedbackRepository.listFeedback({ limit });
}

module.exports = { submitFeedback, listFeedback, VALID_TYPES };
