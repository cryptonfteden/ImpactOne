const test = require("node:test");
const assert = require("node:assert/strict");
const { createRateLimiter, DEFAULT_WINDOW_MS, DEFAULT_MAX_REQUESTS } = require("./rateLimiter");

function fakeReq(ip = "1.2.3.4") {
  return { ip, socket: {} };
}
function fakeRes() {
  const res = { statusCode: 200, headers: {} };
  res.set = (key, value) => { res.headers[key] = value; };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

test("allows requests under the real configured limit", () => {
  const limiter = createRateLimiter({ maxRequests: 3 });
  const req = fakeReq();
  let nextCalls = 0;
  const next = () => { nextCalls += 1; };
  limiter(req, fakeRes(), next);
  limiter(req, fakeRes(), next);
  limiter(req, fakeRes(), next);
  assert.equal(nextCalls, 3);
});

test("rejects with a real 429 once the real configured limit is exceeded within the window", () => {
  const limiter = createRateLimiter({ maxRequests: 2 });
  const req = fakeReq();
  let nextCalls = 0;
  const next = () => { nextCalls += 1; };
  limiter(req, fakeRes(), next);
  limiter(req, fakeRes(), next);
  const res = fakeRes();
  limiter(req, res, next);
  assert.equal(nextCalls, 2);
  assert.equal(res.statusCode, 429);
  assert.ok(res.headers["Retry-After"]);
});

test("tracks each real client key independently — one client's usage never affects another's", () => {
  const limiter = createRateLimiter({ maxRequests: 1 });
  let nextCalls = 0;
  const next = () => { nextCalls += 1; };
  limiter(fakeReq("1.1.1.1"), fakeRes(), next);
  limiter(fakeReq("2.2.2.2"), fakeRes(), next);
  assert.equal(nextCalls, 2);
});

test("resets the real bucket once its own window elapses, never permanently blocking a client", () => {
  let currentTime = 1000;
  const limiter = createRateLimiter({ maxRequests: 1, windowMs: 100, now: () => currentTime });
  const req = fakeReq();
  let nextCalls = 0;
  const next = () => { nextCalls += 1; };
  limiter(req, fakeRes(), next);
  currentTime += 200; // past the real window
  limiter(req, fakeRes(), next);
  assert.equal(nextCalls, 2);
});

test("uses a real default window and request cap when none is configured", () => {
  assert.equal(DEFAULT_WINDOW_MS, 60000);
  assert.equal(DEFAULT_MAX_REQUESTS, 2000);
});

test("supports a real custom keyFn for identifying clients", () => {
  const limiter = createRateLimiter({ maxRequests: 1, keyFn: (req) => req.betaUserId || "anon" });
  let nextCalls = 0;
  const next = () => { nextCalls += 1; };
  limiter({ betaUserId: "user-a" }, fakeRes(), next);
  limiter({ betaUserId: "user-b" }, fakeRes(), next);
  assert.equal(nextCalls, 2);
});
