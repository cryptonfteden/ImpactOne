// Thin node-cron wrapper around the autonomous recommendation engine.
// Deliberately not a queue/worker system (no BullMQ/Redis) — this is a
// single in-process interval trigger, matching the scale this app actually
// needs today. Only ever started from server.js (never app.js), so
// `require("../app")` in tests never leaks a running timer.
const cron = require("node-cron");
const env = require("../config/env");
const autonomousRecommendationEngine = require("./autonomousRecommendationEngine");

let task = null;
let lastRunAt = null;
let lastRunResult = null;

function buildCronExpression(intervalMinutes) {
  const minutes = Math.max(1, Math.min(59, Math.round(intervalMinutes)));
  return `*/${minutes} * * * *`;
}

async function runNow() {
  const result = await autonomousRecommendationEngine.runOnce();
  lastRunAt = new Date();
  lastRunResult = result;
  return result;
}

function start() {
  if (task) {
    return task;
  }

  const expression = buildCronExpression(env.AUTONOMOUS_ENGINE_INTERVAL_MINUTES);
  task = cron.schedule(expression, () => {
    runNow().catch(() => {
      // Errors from a scheduled run are captured in the run log itself
      // (autonomousRecommendationEngine.runOnce never throws past its own
      // try/catch) — this handler only guards against the unexpected.
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
  return {
    enabled: env.AUTONOMOUS_ENGINE_ENABLED,
    running: Boolean(task),
    intervalMinutes: env.AUTONOMOUS_ENGINE_INTERVAL_MINUTES,
    lastRunAt,
    lastRunResult,
  };
}

module.exports = { start, stop, getStatus, runNow };
