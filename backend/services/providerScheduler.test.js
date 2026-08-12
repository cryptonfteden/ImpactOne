require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const providerScheduler = require("./providerScheduler");
const providerRegistry = require("./providers/providerRegistry");

test.beforeEach(async () => {
  await truncateAll();
  providerScheduler.stop();
});

test("getStatus reports not running before start() is called", () => {
  const status = providerScheduler.getStatus();
  assert.equal(status.running, false);
  assert.equal(status.lastRunAt, null);
});

test("start() and stop() toggle the running flag without requiring a real interval tick", () => {
  providerScheduler.start();
  assert.equal(providerScheduler.getStatus().running, true);

  providerScheduler.stop();
  assert.equal(providerScheduler.getStatus().running, false);
});

test("runNow() ingests every registered provider directly and records lastRunAt", async () => {
  const results = await providerScheduler.runNow();
  // Derived from the real registry rather than hardcoded, so this never
  // needs updating again as providers are added (Sprint 37 added 7).
  assert.equal(results.length, providerScheduler.listScheduledProviders().length);
  assert.ok(providerScheduler.getStatus().lastRunAt);
});
