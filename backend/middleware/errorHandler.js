// Phase X9 — Part 3, Crash & Error Reporting. "No silent failures" for
// the backend too: every unhandled error reaching this middleware
// becomes one real ErrorReport row, in addition to the existing console
// log — best-effort and fire-and-forget, so a broken error-reporting
// path can never itself cause a second failure on top of the real one.
const errorReportService = require("../services/errorReportService");

function errorHandler(err, req, res, next) {
  console.error(err);
  errorReportService
    .reportError({
      source: "backend",
      message: err.message || "Internal Server Error",
      stack: err.stack,
      apiInvolved: `${req.method} ${req.originalUrl}`,
      correlationId: req.get("X-Correlation-Id") || null,
      betaUserId: req.betaUserId,
    })
    .catch(() => {
      // Reporting the error must never itself throw or block the real
      // response below.
    });
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
}

module.exports = { errorHandler };
