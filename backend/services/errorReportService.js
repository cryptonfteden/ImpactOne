// Phase X9 — Part 3, Crash & Error Reporting. "No silent failures":
// every real frontend/backend error this system is told about becomes
// one real, structured, persisted row — never just a console line.
const errorReportRepository = require("./errorReportRepository");

const VALID_SOURCES = ["frontend", "backend"];

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function truncate(value, max) {
  if (typeof value !== "string") return null;
  return value.length > max ? value.slice(0, max) : value;
}

async function reportError({ source, message, stack, screen, action, apiInvolved, correlationId, betaUserId }) {
  if (!VALID_SOURCES.includes(source)) {
    throw badRequest(`source must be one of ${VALID_SOURCES.join(", ")}.`);
  }
  const trimmedMessage = String(message || "").trim();
  if (!trimmedMessage) {
    throw badRequest("A real error message is required.");
  }
  return errorReportRepository.createErrorReport({
    source,
    message: truncate(trimmedMessage, 2000),
    stack: truncate(stack, 8000),
    screen: screen || null,
    action: action || null,
    apiInvolved: apiInvolved || null,
    correlationId: correlationId || null,
    betaUserId: betaUserId || null,
  });
}

async function listErrorReports({ limit } = {}) {
  return errorReportRepository.listErrorReports({ limit });
}

module.exports = { reportError, listErrorReports, VALID_SOURCES };
