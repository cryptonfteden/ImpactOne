const test = require("node:test");
const assert = require("node:assert/strict");
const { securityHeaders } = require("./securityHeaders");

function fakeRes() {
  const res = { headers: {} };
  res.set = (key, value) => { res.headers[key] = value; };
  return res;
}

test("sets every real, disclosed security header", () => {
  const res = fakeRes();
  let called = false;
  securityHeaders({ secure: false }, res, () => { called = true; });
  assert.equal(res.headers["X-Content-Type-Options"], "nosniff");
  assert.equal(res.headers["X-Frame-Options"], "DENY");
  assert.equal(res.headers["Referrer-Policy"], "no-referrer");
  assert.equal(res.headers["X-DNS-Prefetch-Control"], "off");
  assert.ok(called);
});

test("only sets Strict-Transport-Security over a real secure (HTTPS) connection", () => {
  const insecureRes = fakeRes();
  securityHeaders({ secure: false }, insecureRes, () => {});
  assert.equal(insecureRes.headers["Strict-Transport-Security"], undefined);

  const secureRes = fakeRes();
  securityHeaders({ secure: true }, secureRes, () => {});
  assert.match(secureRes.headers["Strict-Transport-Security"], /max-age=/);
});

test("always calls next(), never blocking the real request", () => {
  let called = false;
  securityHeaders({ secure: false }, fakeRes(), () => { called = true; });
  assert.equal(called, true);
});
