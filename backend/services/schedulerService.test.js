require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const autonomousRecommendationEngine = require("./autonomousRecommendationEngine");
const schedulerService = require("./schedulerService");

test.beforeEach(async () => {
  await truncateAll();
});

test("getStatus reports not running before start() is called", () => {
  const status = schedulerService.getStatus();
  assert.equal(status.running, false);
  assert.equal(typeof status.intervalMinutes, "number");
});

test("start() and stop() toggle the running flag without requiring a real interval tick", () => {
  schedulerService.start();
  assert.equal(schedulerService.getStatus().running, true);

  schedulerService.stop();
  assert.equal(schedulerService.getStatus().running, false);
});

test("runNow() invokes the recommendation engine directly and records lastRunAt", async () => {
  const original = autonomousRecommendationEngine.runOnce;
  let calls = 0;
  autonomousRecommendationEngine.runOnce = async () => {
    calls += 1;
    return { runLog: null, symbolsEvaluated: 0, recommendationsGenerated: 0, errors: [] };
  };

  try {
    await schedulerService.runNow();
    assert.equal(calls, 1);
    assert.ok(schedulerService.getStatus().lastRunAt instanceof Date);
  } finally {
    autonomousRecommendationEngine.runOnce = original;
    schedulerService.stop();
  }
});
