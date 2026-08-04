const test = require("node:test");
const assert = require("node:assert/strict");
const env = require("../config/env");
const { requireApiKey } = require("./requireApiKey");

function fakeReq(headerValue) {
  return { get: (header) => (header === "X-Admin-Api-Key" ? headerValue : null) };
}
function fakeRes() {
  const res = { statusCode: null, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

test("passes every real request through unchanged when ADMIN_API_KEY is not configured (today's default, backward-compatible)", () => {
  const original = env.ADMIN_API_KEY;
  env.ADMIN_API_KEY = "";
  try {
    let nextCalled = false;
    const res = fakeRes();
    requireApiKey(fakeReq(undefined), res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    assert.equal(res.statusCode, null);
  } finally {
    env.ADMIN_API_KEY = original;
  }
});

test("rejects with a real 401 when ADMIN_API_KEY is configured and no header is present", () => {
  const original = env.ADMIN_API_KEY;
  env.ADMIN_API_KEY = "real-secret";
  try {
    let nextCalled = false;
    const res = fakeRes();
    requireApiKey(fakeReq(undefined), res, () => { nextCalled = true; });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
  } finally {
    env.ADMIN_API_KEY = original;
  }
});

test("rejects with a real 401 when the real provided key does not match the configured one", () => {
  const original = env.ADMIN_API_KEY;
  env.ADMIN_API_KEY = "real-secret";
  try {
    const res = fakeRes();
    requireApiKey(fakeReq("wrong-key"), res, () => {});
    assert.equal(res.statusCode, 401);
  } finally {
    env.ADMIN_API_KEY = original;
  }
});

test("allows the real request through when the provided key exactly matches the configured one", () => {
  const original = env.ADMIN_API_KEY;
  env.ADMIN_API_KEY = "real-secret";
  try {
    let nextCalled = false;
    const res = fakeRes();
    requireApiKey(fakeReq("real-secret"), res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    assert.equal(res.statusCode, null);
  } finally {
    env.ADMIN_API_KEY = original;
  }
});
