const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const { errorHandler } = require("./middleware/errorHandler");
const { betaUserContext } = require("./middleware/betaUserContext");
const { apiLatencyMiddleware } = require("./services/performanceMetricsService");
const { securityHeaders } = require("./middleware/securityHeaders");
const { requestLogger } = require("./middleware/requestLogger");
const { createRateLimiter } = require("./middleware/rateLimiter");

const app = express();

// Phase PLATFORM-HARDENING-002 — closes FINAL_PRODUCTION_READINESS.md's
// named Security/Operational blockers (security headers, rate
// limiting, request logging). Each is additive and applied globally to
// every request, before routing — none of them change any existing
// route's behavior for normal traffic.
app.use(securityHeaders);
app.use(requestLogger);
app.use(createRateLimiter());
app.use(cors());
// Phase PLATFORM-HARDENING-002 — a real, disclosed request-body size
// cap (input hardening); every existing real payload in this codebase
// (agent evidence arrays, claim payloads, recommendation reasoning
// text) is well under 1mb, so this is not expected to affect any
// legitimate caller.
app.use(express.json({ limit: "1mb" }));
// Phase H2 — Beta User Isolation. Best-effort, never blocks a request;
// see middleware/betaUserContext.js.
app.use(betaUserContext);
// Phase X9 — Part 6, Performance Monitoring. Records every real
// request's wall-clock duration; never blocks or alters the response.
app.use(apiLatencyMiddleware);
app.use("/api", routes);
app.get("/health", (req, res) => res.json({ status: "ok" }));
app.use(errorHandler);

module.exports = app;
