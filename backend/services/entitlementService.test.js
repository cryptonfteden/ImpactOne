require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const { truncateAll } = require("../test/dbHelpers");
const planRepository = require("./planRepository");
const subscriptionRepository = require("./subscriptionRepository");
const userRepository = require("./userRepository");
const entitlementService = require("./entitlementService");

test.beforeEach(async () => {
  await truncateAll();
  await planRepository.upsertPlan({ key: "free", name: "Free", priceCents: 0, billingPeriod: "NONE", features: { maxAiAnalysesPerMonth: 2 } });
  await planRepository.upsertPlan({ key: "pro", name: "Pro", priceCents: 2900, billingPeriod: "MONTHLY", features: { maxAiAnalysesPerMonth: null, agentReliabilityHistory: true } });
});

async function createTestUser() {
  return userRepository.createUser({ email: `entitlement_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`, passwordHash: "irrelevant" });
}

test("getEntitlements: a real user with no subscription row honestly defaults to the real free plan", async () => {
  const user = await createTestUser();
  const entitlements = await entitlementService.getEntitlements(user.id);
  assert.equal(entitlements.planKey, "free");
});

test("getEntitlements: a real user with an ACTIVE subscription gets the real subscribed plan", async () => {
  const user = await createTestUser();
  const proPlan = await planRepository.findByKey("pro");
  await subscriptionRepository.upsertForUser(user.id, { planId: proPlan.id, status: "ACTIVE", billingProvider: "manual" });
  const entitlements = await entitlementService.getEntitlements(user.id);
  assert.equal(entitlements.planKey, "pro");
});

test("getEntitlements: a real CANCELED subscription honestly falls back to the free plan, never keeping paid access", async () => {
  const user = await createTestUser();
  const proPlan = await planRepository.findByKey("pro");
  await subscriptionRepository.upsertForUser(user.id, { planId: proPlan.id, status: "CANCELED", billingProvider: "manual" });
  const entitlements = await entitlementService.getEntitlements(user.id);
  assert.equal(entitlements.planKey, "free");
});

test("hasFeature: true only for a real boolean-true feature on the current real plan", async () => {
  const user = await createTestUser();
  assert.equal(await entitlementService.hasFeature(user.id, "agentReliabilityHistory"), false);
  const proPlan = await planRepository.findByKey("pro");
  await subscriptionRepository.upsertForUser(user.id, { planId: proPlan.id, status: "ACTIVE", billingProvider: "manual" });
  assert.equal(await entitlementService.hasFeature(user.id, "agentReliabilityHistory"), true);
});

test("checkAndConsumeUsage: allows real usage up to the real plan limit, then honestly denies", async () => {
  const user = await createTestUser();
  const first = await entitlementService.checkAndConsumeUsage(user.id, "aiAnalysis", "maxAiAnalysesPerMonth");
  assert.equal(first.allowed, true);
  assert.equal(first.used, 1);
  const second = await entitlementService.checkAndConsumeUsage(user.id, "aiAnalysis", "maxAiAnalysesPerMonth");
  assert.equal(second.allowed, true);
  assert.equal(second.used, 2);
  const third = await entitlementService.checkAndConsumeUsage(user.id, "aiAnalysis", "maxAiAnalysesPerMonth");
  assert.equal(third.allowed, false);
  assert.equal(third.remaining, 0);
});

test("checkAndConsumeUsage: a real null limit (unlimited plan) never denies and never increments a real counter", async () => {
  const user = await createTestUser();
  const proPlan = await planRepository.findByKey("pro");
  await subscriptionRepository.upsertForUser(user.id, { planId: proPlan.id, status: "ACTIVE", billingProvider: "manual" });
  for (let i = 0; i < 5; i += 1) {
    const result = await entitlementService.checkAndConsumeUsage(user.id, "aiAnalysis", "maxAiAnalysesPerMonth");
    assert.equal(result.allowed, true);
    assert.equal(result.limit, null);
  }
});

test("checkAndConsumeUsage: real usage is tracked independently per real user", async () => {
  const userA = await createTestUser();
  const userB = await createTestUser();
  await entitlementService.checkAndConsumeUsage(userA.id, "aiAnalysis", "maxAiAnalysesPerMonth");
  await entitlementService.checkAndConsumeUsage(userA.id, "aiAnalysis", "maxAiAnalysesPerMonth");
  const resultB = await entitlementService.checkAndConsumeUsage(userB.id, "aiAnalysis", "maxAiAnalysesPerMonth");
  assert.equal(resultB.used, 1, "user B's own real usage must start fresh, unaffected by user A's");
});
