// Sprint 21A — same single-instance node-cron pattern as
// schedulerService.js and themeSnapshotScheduler.js: one in-process
// trigger, no queue/broker, started only from server.js so tests requiring
// app.js never leak a running timer.
//
// runNow() iterates every registered provider and ingests it sequentially,
// each respecting its own rate limiter. This is the framework's explicit
// extension point for a future queue: swapping this sequential loop for
// "enqueue one job per provider" is the only change a real queue would
// require — runProviderIngestion(providerId) is already a discrete,
// stateless, idempotent unit of work.
const cron = require("node-cron");
const providerRegistry = require("./providers/providerRegistry");
const providerIngestionService = require("./providerIngestionService");

let task = null;
let lastRunAt = null;
let lastRunResult = null;

async function runNow() {
  const results = [];
  for (const provider of providerRegistry.listProviders()) {
    const result = await providerIngestionService.runProviderIngestion(provider.providerId);
    results.push(result);
  }
  lastRunAt = new Date();
  lastRunResult = results;
  return results;
}

function start() {
  if (task) {
    return task;
  }

  // Every 15 minutes — frequent enough to keep the wire-news provider
  // current, well within every provider's own rate limit.
  task = cron.schedule("*/15 * * * *", () => {
    runNow().catch(() => {
      // runProviderIngestion never throws past itself — this only guards
      // the unexpected.
    });
  });
  return task;
}

function stop() {
  if (task) {
    task.stop();
    task = null;
  }
}

function getStatus() {
  return { running: Boolean(task), lastRunAt, lastRunResult };
}

module.exports = { start, stop, getStatus, runNow };
