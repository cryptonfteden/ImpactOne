// Phase PLATFORM-HARDENING-002 — closes FINAL_PRODUCTION_READINESS.md's
// named operational blocker: "zero logging in the Agent Platform." A
// small, structured (one-JSON-line-per-request) logger — no new
// dependency added (no `winston`/`pino`), matching "reuse existing
// infrastructure wherever possible": this reuses the same real
// `X-Correlation-Id` concept `agentObservability`'s own
// `correlationModel.js`/`errorHandler.js` already read, so a single
// request's log line and its downstream agent-execution records (when
// applicable) share one real, traceable id — never a second,
// competing correlation scheme.
//
// Deliberately never blocks or alters the response — logs after the
// real response has already been sent (`res.on("finish")`), the same
// "never blocks or alters the response" discipline already established
// by `apiLatencyMiddleware`/`betaUserContext` in this same file.
function requestLogger(req, res, next) {
  const startedAtMs = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - startedAtMs;
    const line = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs,
      correlationId: req.get("X-Correlation-Id") || null,
      betaUserId: req.betaUserId || null,
    };
    console.log(JSON.stringify(line));
  });

  next();
}

module.exports = { requestLogger };
