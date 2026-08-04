require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const { truncateAll } = require("../test/dbHelpers");
const app = require("../app");

test.beforeEach(async () => {
  await truncateAll();
});

test("GET /api/v2/decision-timeline requires a beta user identity", async () => {
  const response = await request(app).get("/api/v2/decision-timeline");
  assert.equal(response.status, 400);
});

test("GET /api/v2/decision-timeline returns a real, honest empty timeline for a fresh beta user", async () => {
  const betaUserRepository = require("../services/betaUserRepository");
  const inviteCode = "TEST-DECISION-TIMELINE";
  const existing = await betaUserRepository.findByInviteCode(inviteCode);
  const betaUser = existing || (await betaUserRepository.createBetaUser({ label: "Timeline Test User", inviteCode }));

  const response = await request(app).get("/api/v2/decision-timeline").set("X-Beta-User-Id", betaUser.id);
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.events, []);
  assert.equal(response.body.unavailableSources.length, 2);
});
