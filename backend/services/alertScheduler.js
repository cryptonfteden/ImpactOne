// Phase H3 — same single-instance node-cron pattern as providerScheduler.js
// and schedulerService.js: one in-process trigger, no queue/broker.
// runNow() is also called directly by priceAlertController.js's manual
// check endpoint, so both paths (scheduled and on-demand) share one real
// implementation.
const cron = require("node-cron");
const priceAlertService = require("./priceAlertService");

let task = null;
let lastRunAt = null;
let lastRunResult = null;

async function runNow() {
  const results = await priceAlertService.checkAndTriggerAlerts();
  lastRunAt = new Date();
  lastRunResult = results;
  return results;
}

function start() {
  if (task) {
    return task;
  }
  // Every 5 minutes — price alerts benefit from tighter latency than the
  // 15-minute provider ingestion cadence, without hammering Finnhub.
  task = cron.schedule("*/5 * * * *", () => {
    runNow().catch(() => {
      // runNow's own checkAndTriggerAlerts already isolates per-alert
      // failures; this only guards the unexpected.
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
