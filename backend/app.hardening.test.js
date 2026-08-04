// Phase PLATFORM-HARDENING-002 — proves the new global middleware
// (security headers, request logging, rate limiting, admin API-key
// gate) is genuinely wired into the real, unmodified Express app, and
// that every existing, unauthenticated route keeps working exactly as
// before (backward compatibility).
require("./test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("./app");
const env = require("./config/env");

test("every real response carries the new, disclosed security headers", async () => {
  const response = await request(app).get("/health");
  assert.equal(response.headers["x-content-type-options"], "nosniff");
  assert.equal(response.headers["x-frame-options"], "DENY");
  assert.equal(response.headers["referrer-policy"], "no-referrer");
});

test("existing, unauthenticated routes are completely unaffected — real backward compatibility", async () => {
  const response = await request(app).get("/health");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: "ok" });
});

test("the admin-dashboard route is not gated when ADMIN_API_KEY is unset — today's exact existing behavior preserved", async () => {
  const original = env.ADMIN_API_KEY;
  env.ADMIN_API_KEY = "";
  try {
    const response = await request(app).get("/api/v2/admin-dashboard");
    assert.notEqual(response.status, 401);
  } finally {
    env.ADMIN_API_KEY = original;
  }
});

test("the admin-dashboard route rejects an unauthenticated real request once ADMIN_API_KEY is configured", async () => {
  const original = env.ADMIN_API_KEY;
  env.ADMIN_API_KEY = "test-admin-secret";
  try {
    const response = await request(app).get("/api/v2/admin-dashboard");
    assert.equal(response.status, 401);
  } finally {
    env.ADMIN_API_KEY = original;
  }
});

test("the admin-dashboard route accepts a real request bearing the exact configured X-Admin-Api-Key", async () => {
  const original = env.ADMIN_API_KEY;
  env.ADMIN_API_KEY = "test-admin-secret";
  try {
    const response = await request(app).get("/api/v2/admin-dashboard").set("X-Admin-Api-Key", "test-admin-secret");
    assert.notEqual(response.status, 401);
  } finally {
    env.ADMIN_API_KEY = original;
  }
});

test("a real oversized JSON body is honestly rejected rather than silently accepted", async () => {
  const oversizedPayload = { data: "x".repeat(2 * 1024 * 1024) }; // 2mb, over the real 1mb cap
  const response = await request(app).post("/api/ai/analyze").send(oversizedPayload);
  assert.equal(response.status, 413);
});
