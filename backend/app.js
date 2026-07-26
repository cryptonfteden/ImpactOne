const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const { errorHandler } = require("./middleware/errorHandler");
const { betaUserContext } = require("./middleware/betaUserContext");
const { apiLatencyMiddleware } = require("./services/performanceMetricsService");

const app = express();

app.use(cors());
app.use(express.json());
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
