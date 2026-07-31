// Phase COMMERCIAL-MVP-001 — full, real, HTTP-level end-to-end tests
// for the commercial infrastructure: register -> login -> me -> plans
// -> upgrade -> account -> protected-endpoint gating -> logout.
require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const { truncateAll } = require("../test/dbHelpers");
const app = require("../app");
const planRepository = require("../services/planRepository");
const billingService = require("../services/billing/billingService");

test.beforeEach(async () => {
  await truncateAll();
  billingService._resetProviderCacheForTests();
  await planRepository.upsertPlan({ key: "free", name: "Free", priceCents: 0, billingPeriod: "NONE", features: { maxAiAnalysesPerMonth: 2 } });
  await planRepository.upsertPlan({ key: "pro", name: "Pro", priceCents: 2900, billingPeriod: "MONTHLY", features: { maxAiAnalysesPerMonth: null } });
});

function uniqueEmail() {
  return `route_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;
}

test("POST /api/v2/auth/register creates a real account and returns a real, usable token", async () => {
  const email = uniqueEmail();
  const response = await request(app).post("/api/v2/auth/register").send({ email, password: "supersecret123" });
  assert.equal(response.status, 201);
  assert.equal(response.body.user.email, email);
  assert.ok(response.body.token);
});

test("POST /api/v2/auth/register rejects a real duplicate email with a real 409", async () => {
  const email = uniqueEmail();
  await request(app).post("/api/v2/auth/register").send({ email, password: "supersecret123" });
  const second = await request(app).post("/api/v2/auth/register").send({ email, password: "anotherpassword" });
  assert.equal(second.status, 409);
  assert.equal(second.body.errorCode, "EMAIL_TAKEN");
});

test("POST /api/v2/auth/login succeeds with real, correct credentials", async () => {
  const email = uniqueEmail();
  await request(app).post("/api/v2/auth/register").send({ email, password: "supersecret123" });
  const response = await request(app).post("/api/v2/auth/login").send({ email, password: "supersecret123" });
  assert.equal(response.status, 200);
  assert.ok(response.body.token);
});

test("POST /api/v2/auth/login rejects real wrong credentials with a real 401", async () => {
  const email = uniqueEmail();
  await request(app).post("/api/v2/auth/register").send({ email, password: "supersecret123" });
  const response = await request(app).post("/api/v2/auth/login").send({ email, password: "wrongpassword" });
  assert.equal(response.status, 401);
  assert.equal(response.body.errorCode, "INVALID_CREDENTIALS");
});

test("GET /api/v2/auth/me requires a real, valid session — 401 with no token", async () => {
  const response = await request(app).get("/api/v2/auth/me");
  assert.equal(response.status, 401);
});

test("GET /api/v2/auth/me returns the real, authenticated user's own id", async () => {
  const email = uniqueEmail();
  const registered = await request(app).post("/api/v2/auth/register").send({ email, password: "supersecret123" });
  const response = await request(app).get("/api/v2/auth/me").set("Authorization", `Bearer ${registered.body.token}`);
  assert.equal(response.status, 200);
  assert.equal(response.body.userId, registered.body.user.id);
});

test("GET /api/v2/billing/plans is a real, public, unauthenticated read of the real plan catalog", async () => {
  const response = await request(app).get("/api/v2/billing/plans");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.plans.map((p) => p.key).sort(), ["free", "pro"]);
});

test("GET /api/v2/billing/provider honestly reports the real, currently-configured billing provider", async () => {
  const response = await request(app).get("/api/v2/billing/provider");
  assert.equal(response.status, 200);
  assert.equal(response.body.provider, "manual");
});

test("every real /api/v2/account/* endpoint requires a real, valid session — 401 with no token", async () => {
  const getResponse = await request(app).get("/api/v2/account");
  assert.equal(getResponse.status, 401);
  const upgradeResponse = await request(app).post("/api/v2/account/upgrade").send({ planKey: "pro" });
  assert.equal(upgradeResponse.status, 401);
  const cancelResponse = await request(app).post("/api/v2/account/cancel");
  assert.equal(cancelResponse.status, 401);
});

test("GET /api/v2/account returns the real, authenticated user's real account + free-plan entitlements", async () => {
  const email = uniqueEmail();
  const registered = await request(app).post("/api/v2/auth/register").send({ email, password: "supersecret123" });
  const response = await request(app).get("/api/v2/account").set("Authorization", `Bearer ${registered.body.token}`);
  assert.equal(response.status, 200);
  assert.equal(response.body.email, email);
  assert.equal(response.body.plan.planKey, "free");
  assert.equal(response.body.subscription, null);
});

test("POST /api/v2/account/upgrade performs a real upgrade to pro via the real, configured (manual) billing provider", async () => {
  const registered = await request(app).post("/api/v2/auth/register").send({ email: uniqueEmail(), password: "supersecret123" });
  const token = registered.body.token;

  const upgrade = await request(app).post("/api/v2/account/upgrade").set("Authorization", `Bearer ${token}`).send({ planKey: "pro" });
  assert.equal(upgrade.status, 200);
  assert.equal(upgrade.body.plan.key, "pro");

  const account = await request(app).get("/api/v2/account").set("Authorization", `Bearer ${token}`);
  assert.equal(account.body.plan.planKey, "pro");
  assert.equal(account.body.subscription.status, "ACTIVE");
});

test("POST /api/v2/account/upgrade rejects a real, unknown plan key with a real 404", async () => {
  const registered = await request(app).post("/api/v2/auth/register").send({ email: uniqueEmail(), password: "supersecret123" });
  const response = await request(app).post("/api/v2/account/upgrade").set("Authorization", `Bearer ${registered.body.token}`).send({ planKey: "not-a-real-plan" });
  assert.equal(response.status, 404);
  assert.equal(response.body.errorCode, "PLAN_NOT_FOUND");
});

test("POST /api/v2/account/cancel cancels a real, active subscription", async () => {
  const registered = await request(app).post("/api/v2/auth/register").send({ email: uniqueEmail(), password: "supersecret123" });
  const token = registered.body.token;
  await request(app).post("/api/v2/account/upgrade").set("Authorization", `Bearer ${token}`).send({ planKey: "pro" });

  const cancel = await request(app).post("/api/v2/account/cancel").set("Authorization", `Bearer ${token}`);
  assert.equal(cancel.status, 200);
  assert.equal(cancel.body.subscription.status, "CANCELED");
});

test("POST /api/v2/auth/logout revokes the real session — a subsequent real request with the same token is rejected", async () => {
  const registered = await request(app).post("/api/v2/auth/register").send({ email: uniqueEmail(), password: "supersecret123" });
  const token = registered.body.token;

  const logout = await request(app).post("/api/v2/auth/logout").set("Authorization", `Bearer ${token}`);
  assert.equal(logout.status, 200);

  const meAfterLogout = await request(app).get("/api/v2/auth/me").set("Authorization", `Bearer ${token}`);
  assert.equal(meAfterLogout.status, 401);
});

test("the full report of a real, protected commercial endpoint never contains a forbidden governance key", async () => {
  const registered = await request(app).post("/api/v2/auth/register").send({ email: uniqueEmail(), password: "supersecret123" });
  const account = await request(app).get("/api/v2/account").set("Authorization", `Bearer ${registered.body.token}`);
  const serialized = JSON.stringify(account.body);
  for (const forbidden of ["action", "decision", "verdict", "finalDecision", "recommendation"]) {
    assert.ok(!new RegExp(`"${forbidden}"\\s*:`).test(serialized), `must not contain forbidden key "${forbidden}"`);
  }
});
