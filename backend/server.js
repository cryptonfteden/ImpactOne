const { PORT, AUTONOMOUS_ENGINE_ENABLED, SHUTDOWN_TIMEOUT_MS } = require("./config/env");
const { validateEnvironmentOrExit } = require("./config/startupValidation");
const app = require("./app");
const schedulerService = require("./services/schedulerService");
const themeSnapshotScheduler = require("./services/themeSnapshotScheduler");
const providerScheduler = require("./services/providerScheduler");
const alertScheduler = require("./services/alertScheduler");
const { getPrismaClient } = require("./db/prismaClient");
const redisClient = require("./services/redisCache/redisClient");
const { createShutdownHandler } = require("./shutdown");

// Phase PRODUCTION-DEPLOYMENT-001 — real, fail-fast startup validation.
// Refuses to accept a single request against a known-broken
// configuration (e.g. a real production deploy missing JWT_SECRET)
// rather than starting and failing unpredictably on the first request
// that needs it.
validateEnvironmentOrExit();

const server = app.listen(PORT, () => {
  console.log(`ImpactOne backend running on port ${PORT}`);

  if (AUTONOMOUS_ENGINE_ENABLED) {
    schedulerService.start();
  }

  themeSnapshotScheduler.start();
  providerScheduler.start();
  alertScheduler.start();
});

// Phase PRODUCTION-DEPLOYMENT-001 — graceful shutdown. Stops accepting
// new connections, lets in-flight requests finish (bounded by
// SHUTDOWN_TIMEOUT_MS so a stuck connection can never hang a real
// deployment's rolling restart), stops every scheduler, and closes the
// real DB/Redis connections — before exiting. The actual logic lives in
// shutdown.js as a pure, dependency-injected factory (directly unit-
// testable); this is just the real wiring.
const shutdown = createShutdownHandler({
  server,
  schedulers: [schedulerService, themeSnapshotScheduler, providerScheduler, alertScheduler],
  disconnectDatabase: () => getPrismaClient().$disconnect(),
  disconnectRedis: () => redisClient._resetForTests(),
  shutdownTimeoutMs: SHUTDOWN_TIMEOUT_MS,
});

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

module.exports = { server, shutdown };
