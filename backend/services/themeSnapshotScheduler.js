// Sprint 20, Part 6 — daily best-effort capture of each theme's confidence
// snapshot, mirroring schedulerService.js's exact pattern: a single
// in-process node-cron trigger (no queue/broker), started only from
// server.js so tests requiring app.js never leak a running timer.
const cron = require("node-cron");
const themeIntelligenceService = require("./themeIntelligenceService");

let task = null;
let lastRunAt = null;
let lastRunResult = null;

async function runNow() {
  const result = await themeIntelligenceService.captureTodaySnapshotForAllThemes();
  lastRunAt = new Date();
  lastRunResult = result;
  return result;
}

function start() {
  if (task) {
    return task;
  }

  // Once daily, just after midnight UTC — a fresh confidence snapshot per
  // theme per calendar day.
  task = cron.schedule("5 0 * * *", () => {
    runNow().catch(() => {
      // captureTodaySnapshotForAllThemes never throws past its own
      // per-theme try/catch — this only guards the unexpected.
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
