require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const themeIntelligenceService = require("./themeIntelligenceService");
const themeSnapshotScheduler = require("./themeSnapshotScheduler");

test.beforeEach(async () => {
  await truncateAll();
});

test("getStatus reports not running before start() is called", () => {
  const status = themeSnapshotScheduler.getStatus();
  assert.equal(status.running, false);
});

test("start() and stop() toggle the running flag without requiring a real interval tick", () => {
  themeSnapshotScheduler.start();
  assert.equal(themeSnapshotScheduler.getStatus().running, true);

  themeSnapshotScheduler.stop();
  assert.equal(themeSnapshotScheduler.getStatus().running, false);
});

test("runNow() invokes the theme capture directly and records lastRunAt", async () => {
  const original = themeIntelligenceService.captureTodaySnapshotForAllThemes;
  let calls = 0;
  themeIntelligenceService.captureTodaySnapshotForAllThemes = async () => {
    calls += 1;
    return [];
  };

  try {
    await themeSnapshotScheduler.runNow();
    assert.equal(calls, 1);
    assert.ok(themeSnapshotScheduler.getStatus().lastRunAt instanceof Date);
  } finally {
    themeIntelligenceService.captureTodaySnapshotForAllThemes = original;
    themeSnapshotScheduler.stop();
  }
});
