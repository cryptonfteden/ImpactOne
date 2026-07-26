require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const featureFlagService = require("./featureFlagService");

test.beforeEach(async () => {
  await truncateAll();
});

test("an undeclared flag evaluates to false, never fabricated as enabled", async () => {
  assert.equal(await featureFlagService.isFeatureEnabled("never_created", "beta-1"), false);
});

test("setFlag rejects an invalid mode", async () => {
  await assert.rejects(() => featureFlagService.setFlag("real_flag", { mode: "MAYBE" }), /mode must be one of/);
});

test("ENABLED mode is on for everyone, including anonymous requests", async () => {
  await featureFlagService.setFlag("new_chart_tool", { mode: "ENABLED" });
  assert.equal(await featureFlagService.isFeatureEnabled("new_chart_tool", null), true);
  assert.equal(await featureFlagService.isFeatureEnabled("new_chart_tool", "beta-1"), true);
});

test("DISABLED mode is off for everyone", async () => {
  await featureFlagService.setFlag("retired_feature", { mode: "DISABLED" });
  assert.equal(await featureFlagService.isFeatureEnabled("retired_feature", "beta-1"), false);
});

test("BETA_ONLY mode requires a real resolved identity, off for anonymous", async () => {
  await featureFlagService.setFlag("beta_exclusive", { mode: "BETA_ONLY" });
  assert.equal(await featureFlagService.isFeatureEnabled("beta_exclusive", null), false);
  assert.equal(await featureFlagService.isFeatureEnabled("beta_exclusive", "beta-1"), true);
});

test("USER_SPECIFIC mode is only enabled for the exact real listed users", async () => {
  await featureFlagService.setFlag("early_access", { mode: "USER_SPECIFIC", enabledForUsers: ["beta-1", "beta-2"] });
  assert.equal(await featureFlagService.isFeatureEnabled("early_access", "beta-1"), true);
  assert.equal(await featureFlagService.isFeatureEnabled("early_access", "beta-3"), false);
  assert.equal(await featureFlagService.isFeatureEnabled("early_access", null), false);
});

test("setFlag toggling requires no code change — re-setting the same key changes its live evaluation immediately", async () => {
  await featureFlagService.setFlag("toggle_me", { mode: "DISABLED" });
  assert.equal(await featureFlagService.isFeatureEnabled("toggle_me", "beta-1"), false);
  await featureFlagService.setFlag("toggle_me", { mode: "ENABLED" });
  assert.equal(await featureFlagService.isFeatureEnabled("toggle_me", "beta-1"), true);
});
