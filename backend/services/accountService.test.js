require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const { truncateAll } = require("../test/dbHelpers");
const planRepository = require("./planRepository");
const userRepository = require("./userRepository");
const accountService = require("./accountService");
const billingService = require("./billing/billingService");

test.beforeEach(async () => {
  await truncateAll();
  billingService._resetProviderCacheForTests();
  await planRepository.upsertPlan({ key: "free", name: "Free", priceCents: 0, billingPeriod: "NONE", features: { maxAiAnalysesPerMonth: 2 } });
  await planRepository.upsertPlan({ key: "pro", name: "Pro", priceCents: 2900, billingPeriod: "MONTHLY", features: { maxAiAnalysesPerMonth: null } });
});

async function createTestUser() {
  return userRepository.createUser({ email: `account_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`, passwordHash: "irrelevant" });
}

test("getAccount: a real, freshly-registered user starts on the real free plan with no subscription", async () => {
  const user = await createTestUser();
  const account = await accountService.getAccount(user.id);
  assert.equal(account.plan.planKey, "free");
  assert.equal(account.subscription, null);
});

test("getAccount: throws a real 404 for an unknown user id", async () => {
  await assert.rejects(() => accountService.getAccount("00000000-0000-0000-0000-000000000000"), /ACCOUNT_NOT_FOUND|not found/i);
});

test("upgradePlan: a real upgrade to 'pro' persists a real, active subscription via the configured (manual) billing provider", async () => {
  const user = await createTestUser();
  const result = await accountService.upgradePlan(user.id, "pro");
  assert.equal(result.plan.key, "pro");
  assert.equal(result.subscription.status, "ACTIVE");
  assert.equal(result.subscription.billingProvider, "manual");

  const account = await accountService.getAccount(user.id);
  assert.equal(account.plan.planKey, "pro");
});

test("upgradePlan: rejects a real, unknown plan key", async () => {
  const user = await createTestUser();
  await assert.rejects(() => accountService.upgradePlan(user.id, "not-a-real-plan"), /PLAN_NOT_FOUND|Unknown plan/i);
});

test("upgradePlan: re-upgrading reuses the real, already-created external customer id rather than creating a duplicate", async () => {
  const user = await createTestUser();
  const first = await accountService.upgradePlan(user.id, "pro");
  const second = await accountService.upgradePlan(user.id, "pro");
  assert.equal(first.subscription.externalCustomerId, second.subscription.externalCustomerId);
});

test("cancelPlan: cancels a real, active subscription", async () => {
  const user = await createTestUser();
  await accountService.upgradePlan(user.id, "pro");
  const canceled = await accountService.cancelPlan(user.id);
  assert.equal(canceled.status, "CANCELED");
  assert.equal(canceled.cancelAtPeriodEnd, true);
});

test("cancelPlan: rejects when a real user has no subscription to cancel", async () => {
  const user = await createTestUser();
  await assert.rejects(() => accountService.cancelPlan(user.id), /NO_SUBSCRIPTION|No active subscription/i);
});
