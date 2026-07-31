require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const { truncateAll } = require("../test/dbHelpers");
const { requireFeature, requireUsageLimit } = require("./requireFeature");
const planRepository = require("../services/planRepository");
const userRepository = require("../services/userRepository");
const subscriptionRepository = require("../services/subscriptionRepository");

test.beforeEach(async () => {
  await truncateAll();
  await planRepository.upsertPlan({ key: "free", name: "Free", priceCents: 0, billingPeriod: "NONE", features: { maxAiAnalysesPerMonth: 1 } });
  await planRepository.upsertPlan({ key: "pro", name: "Pro", priceCents: 2900, billingPeriod: "MONTHLY", features: { maxAiAnalysesPerMonth: null, proOnlyFeature: true } });
});

function fakeRes() {
  const res = { statusCode: null, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

async function createTestUser() {
  return userRepository.createUser({ email: `feature_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`, passwordHash: "irrelevant" });
}

test("requireFeature: rejects with a real 401 when req.userId is not set (requireAuth must run first)", async () => {
  const middleware = requireFeature("proOnlyFeature");
  const res = fakeRes();
  await middleware({}, res, () => {});
  assert.equal(res.statusCode, 401);
});

test("requireFeature: rejects a real free-plan user with a real 403", async () => {
  const user = await createTestUser();
  const middleware = requireFeature("proOnlyFeature");
  const res = fakeRes();
  await middleware({ userId: user.id }, res, () => {});
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.errorCode, "FEATURE_NOT_ENTITLED");
});

test("requireFeature: allows a real pro-plan user through", async () => {
  const user = await createTestUser();
  const proPlan = await planRepository.findByKey("pro");
  await subscriptionRepository.upsertForUser(user.id, { planId: proPlan.id, status: "ACTIVE", billingProvider: "manual" });
  const middleware = requireFeature("proOnlyFeature");
  let nextCalled = false;
  await middleware({ userId: user.id }, fakeRes(), () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});

test("requireUsageLimit: allows a real free-plan user up to their real limit, then honestly rejects with 429", async () => {
  const user = await createTestUser();
  const middleware = requireUsageLimit("aiAnalysis", "maxAiAnalysesPerMonth");

  let firstNextCalled = false;
  await middleware({ userId: user.id }, fakeRes(), () => { firstNextCalled = true; });
  assert.equal(firstNextCalled, true);

  const res = fakeRes();
  await middleware({ userId: user.id }, res, () => {});
  assert.equal(res.statusCode, 429);
  assert.equal(res.body.errorCode, "USAGE_LIMIT_EXCEEDED");
});

test("requireUsageLimit: a real pro-plan (unlimited) user is never rejected", async () => {
  const user = await createTestUser();
  const proPlan = await planRepository.findByKey("pro");
  await subscriptionRepository.upsertForUser(user.id, { planId: proPlan.id, status: "ACTIVE", billingProvider: "manual" });
  const middleware = requireUsageLimit("aiAnalysis", "maxAiAnalysesPerMonth");
  for (let i = 0; i < 3; i += 1) {
    let nextCalled = false;
    await middleware({ userId: user.id }, fakeRes(), () => { nextCalled = true; });
    assert.equal(nextCalled, true);
  }
});
