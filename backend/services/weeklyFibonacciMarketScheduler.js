const cron = require("node-cron");
const scanner = require("./weeklyFibonacciOpportunityService");

let task = null;
let lastRunAt = null;
let lastRunResult = null;
let lastError = null;

async function runNow() {
  try {
    const payload = await scanner.scanNextMarketBatch();
    lastRunAt = new Date();
    lastRunResult = payload?.coverage || null;
    lastError = null;
    return payload;
  } catch (error) {
    lastRunAt = new Date();
    lastError = error.message;
    throw error;
  }
}

function start() {
  if (task) return task;
  // Twelve batches per hour complete a typical 5,000-stock US universe in
  // roughly four hours, while bounded provider concurrency protects the live
  // chart and user searches from a market-wide discovery scan.
  task = cron.schedule("*/5 * * * *", () => runNow().catch(() => {}));
  const immediate = setTimeout(() => runNow().catch(() => {}), 1000);
  if (immediate.unref) immediate.unref();
  return task;
}

function stop() {
  if (task) {
    task.stop();
    task = null;
  }
}

function getStatus() {
  return { running: Boolean(task), lastRunAt, lastRunResult, lastError };
}

module.exports = { start, stop, runNow, getStatus };
