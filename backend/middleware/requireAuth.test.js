require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const { truncateAll } = require("../test/dbHelpers");
const { requireAuth, extractBearerToken } = require("./requireAuth");
const authService = require("../services/authService");

test.beforeEach(async () => {
  await truncateAll();
});

function fakeReq(authHeader) {
  return { get: (header) => (header === "Authorization" ? authHeader : null) };
}
function fakeRes() {
  const res = { statusCode: null, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

test("extractBearerToken: parses a real 'Bearer <token>' header", () => {
  assert.equal(extractBearerToken(fakeReq("Bearer abc.def.ghi")), "abc.def.ghi");
});

test("extractBearerToken: honestly returns null with no real Authorization header", () => {
  assert.equal(extractBearerToken(fakeReq(undefined)), null);
});

test("extractBearerToken: honestly returns null for a malformed header (no 'Bearer' prefix)", () => {
  assert.equal(extractBearerToken(fakeReq("just-a-token")), null);
});

test("requireAuth: rejects with a real 401 when no token is present — fails closed, never passes through", async () => {
  let nextCalled = false;
  const res = fakeRes();
  await requireAuth(fakeReq(undefined), res, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
});

test("requireAuth: rejects a real, garbage token with a real 401", async () => {
  const res = fakeRes();
  await requireAuth(fakeReq("Bearer not-a-real-token"), res, () => {});
  assert.equal(res.statusCode, 401);
});

test("requireAuth: allows a real, freshly-issued token through and sets req.userId", async () => {
  const { token, user } = await authService.register(`mw_${Date.now()}@example.com`, "supersecret123");
  const req = fakeReq(`Bearer ${token}`);
  let nextCalled = false;
  await requireAuth(req, fakeRes(), () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(req.userId, user.id);
});

test("requireAuth: rejects a real, revoked (logged-out) token", async () => {
  const { token } = await authService.register(`mw2_${Date.now()}@example.com`, "supersecret123");
  await authService.logout(token);
  const res = fakeRes();
  await requireAuth(fakeReq(`Bearer ${token}`), res, () => {});
  assert.equal(res.statusCode, 401);
});
