require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const { truncateAll } = require("../test/dbHelpers");
const app = require("../app");
const betaUserRepository = require("../services/betaUserRepository");

test.beforeEach(async () => {
  await truncateAll();
});

// Phase X4 — end-to-end: fresh beta onboarding via the real HTTP surface.
test("fresh onboarding: resolving a real invite code returns a real betaUserId and label", async () => {
  const code = `FRESH-${Date.now()}`;
  await betaUserRepository.createBetaUser({ label: "Beta User A", inviteCode: code });

  const response = await request(app).get(`/api/v2/beta/resolve?code=${code}`);
  assert.equal(response.status, 200);
  assert.ok(response.body.betaUserId);
  assert.equal(response.body.label, "Beta User A");
});

test("resolving an unknown invite code returns a specific, distinguishable error — never a raw stack trace", async () => {
  const response = await request(app).get("/api/v2/beta/resolve?code=DOES-NOT-EXIST");
  assert.equal(response.status, 404);
  assert.equal(response.body.errorCode, "INVALID_CODE");
  assert.ok(response.body.error);
});

test("resolving an empty code returns a specific MISSING_CODE error", async () => {
  const response = await request(app).get("/api/v2/beta/resolve?code=");
  assert.equal(response.status, 400);
  assert.equal(response.body.errorCode, "MISSING_CODE");
});

test("resolving a real, expired invite code returns a specific EXPIRED_CODE error, distinct from invalid", async () => {
  const code = `EXPIRED-${Date.now()}`;
  const betaUser = await betaUserRepository.createBetaUser({ label: "Expired User", inviteCode: code });
  const { getPrismaClient } = require("../db/prismaClient");
  await getPrismaClient().betaUser.update({ where: { id: betaUser.id }, data: { expiresAt: new Date(Date.now() - 86400000) } });

  const response = await request(app).get(`/api/v2/beta/resolve?code=${code}`);
  assert.equal(response.status, 410);
  assert.equal(response.body.errorCode, "EXPIRED_CODE");
});

test("resolving a real, non-expired invite code succeeds — identity persistence via header works end-to-end", async () => {
  const code = `VALID-${Date.now()}`;
  await betaUserRepository.createBetaUser({ label: "Real Beta User", inviteCode: code });

  const resolveResponse = await request(app).get(`/api/v2/beta/resolve?code=${code}`);
  assert.equal(resolveResponse.status, 200);
  const { betaUserId, label } = resolveResponse.body;
  assert.ok(betaUserId);
  assert.equal(label, "Real Beta User");

  // Session restoration: the SAME identity, sent as a header on a fresh
  // request (simulating a new page load with a stored id), resolves to
  // real, isolated data — proving the header IS the real session.
  const folderResponse = await request(app)
    .post("/api/v2/watchlist-folders")
    .set("X-Beta-User-Id", betaUserId)
    .send({ name: "AI" });
  assert.equal(folderResponse.status, 201);
  assert.equal(folderResponse.body.betaUserId, betaUserId);
});

test("whoami confirms a real, valid stored identity", async () => {
  const code = `WHOAMI-${Date.now()}`;
  const betaUser = await betaUserRepository.createBetaUser({ label: "Whoami User", inviteCode: code });

  const response = await request(app).get("/api/v2/beta/whoami").set("X-Beta-User-Id", betaUser.id);
  assert.equal(response.status, 200);
  assert.equal(response.body.betaUserId, betaUser.id);
  assert.equal(response.body.label, "Whoami User");
});

test("whoami with no header returns a clean 404, never a raw error", async () => {
  const response = await request(app).get("/api/v2/beta/whoami");
  assert.equal(response.status, 404);
  assert.equal(response.body.errorCode, "NO_IDENTITY");
});

test("whoami with a real but expired identity returns 404 — a stale local identity is honestly rejected, not silently accepted", async () => {
  const code = `WHOAMI-EXPIRED-${Date.now()}`;
  const betaUser = await betaUserRepository.createBetaUser({ label: "Expired", inviteCode: code });
  const { getPrismaClient } = require("../db/prismaClient");
  await getPrismaClient().betaUser.update({ where: { id: betaUser.id }, data: { expiresAt: new Date(Date.now() - 1000) } });

  const response = await request(app).get("/api/v2/beta/whoami").set("X-Beta-User-Id", betaUser.id);
  assert.equal(response.status, 404);
});

// Protected-route behavior: every protected feature must work
// immediately after onboarding, with no developer intervention.
test("protected routes (Decision Center, Notifications, Workspaces) all work immediately with a freshly resolved identity", async () => {
  const code = `PROTECTED-${Date.now()}`;
  const resolveResponse = await request(app).get(`/api/v2/beta/resolve?code=${code}`);
  assert.equal(resolveResponse.status, 404); // not created yet — confirms the code truly doesn't exist first
  await betaUserRepository.createBetaUser({ label: "Protected Flow User", inviteCode: code });
  const { betaUserId } = (await request(app).get(`/api/v2/beta/resolve?code=${code}`)).body;

  const decisions = await request(app).get("/api/v2/decisions").set("X-Beta-User-Id", betaUserId);
  assert.equal(decisions.status, 200);

  const notifications = await request(app).get("/api/v2/notifications").set("X-Beta-User-Id", betaUserId);
  assert.equal(notifications.status, 200);

  const folders = await request(app).get("/api/v2/watchlist-folders").set("X-Beta-User-Id", betaUserId);
  assert.equal(folders.status, 200);
});

// Recovery flow: no identity at all (never resolved, or storage cleared)
// gets a specific, non-technical 400 from the identity-required guard —
// never an unhandled exception or a raw Prisma error.
test("protected routes with no identity return a clean, specific error — never a raw technical error", async () => {
  const response = await request(app).get("/api/v2/decisions");
  assert.equal(response.status, 400);
  assert.match(response.body.error, /beta user identity is required/i);
});
