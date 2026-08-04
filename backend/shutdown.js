// Phase PRODUCTION-DEPLOYMENT-001 — graceful shutdown logic, extracted
// into a pure, dependency-injected factory so it's directly unit-
// testable (no real HTTP server, DB, or OS signal required) — mirrors
// this codebase's existing injectable-provider convention (see
// services/billing/providers/stripeBillingProvider.js).
/**
 * @param {{
 *   server: { close: (cb: (err?: Error) => void) => void },
 *   schedulers: Array<{ stop: () => void }>,
 *   disconnectDatabase: () => Promise<void>,
 *   disconnectRedis: () => Promise<void>,
 *   shutdownTimeoutMs: number,
 *   exit?: (code: number) => void,
 *   log?: (...args: any[]) => void,
 *   setTimeoutFn?: typeof setTimeout,
 *   clearTimeoutFn?: typeof clearTimeout,
 * }} deps
 */
function createShutdownHandler({
  server,
  schedulers,
  disconnectDatabase,
  disconnectRedis,
  shutdownTimeoutMs,
  exit = process.exit,
  log = console.log,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
}) {
  let shuttingDown = false;

  return async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    log(`[server] Received ${signal}. Starting graceful shutdown...`);

    const forceExitTimer = setTimeoutFn(() => {
      log(`[server] Graceful shutdown exceeded ${shutdownTimeoutMs}ms — forcing exit.`);
      exit(1);
    }, shutdownTimeoutMs);
    if (forceExitTimer.unref) forceExitTimer.unref();

    schedulers.forEach((scheduler) => scheduler.stop());

    return new Promise((resolve) => {
      server.close(async (err) => {
        if (err) {
          log("[server] Error while closing the HTTP server:", err);
        }

        try {
          await disconnectDatabase();
        } catch {
          // Never block shutdown on a database that may already be gone.
        }

        try {
          await disconnectRedis();
        } catch {
          // Never block shutdown on a Redis connection that may already be gone.
        }

        clearTimeoutFn(forceExitTimer);
        log("[server] Graceful shutdown complete.");
        exit(0);
        resolve();
      });
    });
  };
}

module.exports = { createShutdownHandler };
